package com.neutrondict.app.media

import android.content.Context
import android.text.TextUtils
import com.kienhoang.dualsubreplay.assistant.KeystoreSecretCipher
import com.kienhoang.dualsubreplay.assistant.AI_KEYS_PREFERENCES
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.time.YearMonth
import java.util.Base64

/** Optional Azure F0 audio, with a bounded private cache and device-TTS fallback. */
class AzureSpeech(private val context: Context) {
    private val prefs = context.getSharedPreferences("neutron_voice", Context.MODE_PRIVATE)
    // Reuse the existing excluded-from-backup encrypted secret store.
    private val secrets = context.getSharedPreferences(AI_KEYS_PREFERENCES, Context.MODE_PRIVATE)
    private val cipher = KeystoreSecretCipher()
    fun status(): JSONObject = JSONObject()
        .put("enabled", prefs.getBoolean("enabled", false))
        .put("region", prefs.getString("region", "japaneast"))
        .put("hasKey", secrets.contains("neutron_azure_key"))
        .put("used", if (prefs.getString("month", "") == YearMonth.now().toString()) prefs.getInt("used", 0) else 0)
        .put("limit", 450000)

    fun configure(data: JSONObject): JSONObject {
        val region = data.optString("region", "japaneast").trim().lowercase()
        require(region.matches(Regex("[a-z][a-z0-9]{1,39}"))) { "Mã vùng Azure không hợp lệ." }
        val key = data.optString("key").trim()
        if (data.optBoolean("clearKey")) check(secrets.edit().remove("neutron_azure_key").commit())
        else if (key.isNotEmpty()) {
            require(key.length in 16..256 && !key.contains('\n')) { "Khóa Azure không hợp lệ." }
            val sealed = Base64.getEncoder().encodeToString(cipher.encrypt(key.toByteArray()))
            check(secrets.edit().putString("neutron_azure_key", sealed).commit())
        }
        check(prefs.edit().putBoolean("enabled", data.optBoolean("enabled"))
            .putString("region", region).putLong("retryAt", 0).commit())
        return status()
    }
    private fun fallback(reason: String) = JSONObject().put("available", false).put("reason", reason)
    fun synthesize(data: JSONObject): JSONObject {
        if (!prefs.getBoolean("enabled", false)) return fallback("")
        val text = data.optString("text").trim()
        val lang = data.optString("lang").substringBefore('-')
        if (text.isEmpty() || text.length > 4000 || lang !in listOf("ja","en")) return fallback("Đang dùng giọng trên máy.")
        val locale = if (lang == "ja") "ja-JP" else "en-US"
        val voice = if (lang == "ja") "ja-JP-NanamiNeural" else "en-US-JennyNeural"
        val rate = data.optDouble("rate", 1.0).takeIf { it.isFinite() }?.coerceIn(0.5, 1.5) ?: 1.0
        val hash = MessageDigest.getInstance("SHA-256").digest((voice+"|"+rate+"|"+text).toByteArray()).joinToString("") { "%02x".format(it) }
        val dir = File(context.cacheDir, "neutron-voice").apply { mkdirs() }
        val file = File(dir, hash+".mp3")
        fun audio(bytes: ByteArray, cached: Boolean) = JSONObject().put("available", true).put("cached", cached)
            .put("audio", "data:audio/mpeg;base64,"+Base64.getEncoder().encodeToString(bytes))
        if (file.isFile && file.length() in 1..2_000_000) {
            file.setLastModified(System.currentTimeMillis())
            return audio(file.readBytes(), true)
        }
        val now = System.currentTimeMillis()
        if (prefs.getLong("retryAt", 0) > now) return fallback("Azure tạm hết lượt hoặc chưa khả dụng · dùng giọng trên máy.")
        val month = YearMonth.now().toString()
        val used = if (prefs.getString("month", "") == month) prefs.getInt("used", 0) else 0
        // Local guard is conservative; Azure F0 remains the authoritative shared-account limit.
        if (used + text.length > 450000) return fallback("Đã chạm giới hạn Azure của app tháng này · dùng giọng trên máy.")
        val key = runCatching {
            String(cipher.decrypt(Base64.getDecoder().decode(secrets.getString("neutron_azure_key", "")!!)))
        }.getOrNull() ?: return fallback("Chưa có khóa Azure hợp lệ · dùng giọng trên máy.")
        val region = prefs.getString("region", "japaneast")!!
        if (!region.matches(Regex("[a-z][a-z0-9]{1,39}"))) return fallback("Vùng Azure không hợp lệ.")
        var connection: HttpURLConnection? = null
        return try {
            connection = URL("https://"+region+".tts.speech.microsoft.com/cognitiveservices/v1").openConnection() as HttpURLConnection
            connection.apply {
                requestMethod = "POST"; connectTimeout = 2500; readTimeout = 4000
                instanceFollowRedirects = false; doOutput = true
                setRequestProperty("Ocp-Apim-Subscription-Key", key)
                setRequestProperty("Content-Type", "application/ssml+xml")
                setRequestProperty("X-Microsoft-OutputFormat", "audio-24khz-48kbitrate-mono-mp3")
                setRequestProperty("User-Agent", "NeutronDict")
            }
            val percent = ((rate-1)*100).toInt()
            val ssml = "<speak version='1.0' xml:lang='"+locale+"'><voice name='"+voice+"'><prosody rate='"+percent+"%'>"+TextUtils.htmlEncode(text)+"</prosody></voice></speak>"
            // Count requests conservatively even if a timeout leaves the server outcome unknown.
            check(prefs.edit().putString("month", month).putInt("used", used+text.length).commit())
            connection.outputStream.use { it.write(ssml.toByteArray(Charsets.UTF_8)) }
            val status = connection.responseCode
            if (status != 200) {
                val pause = if (status == 429) 3600000L else if (status == 401 || status == 403) 86400000L else 60000L
                prefs.edit().putLong("retryAt", now+pause).apply()
                fallback("Azure chưa khả dụng · dùng giọng trên máy.")
            } else {
                val bytes = connection.inputStream.use { input ->
                    val out = java.io.ByteArrayOutputStream()
                    val buffer = ByteArray(8192)
                    while (true) {
                        val n = input.read(buffer); if (n < 0) break
                        check(out.size() + n <= 2_000_000); out.write(buffer, 0, n)
                    }
                    out.toByteArray()
                }
                check(bytes.isNotEmpty() && bytes.size <= 2_000_000) { "Audio không hợp lệ." }
                val temp = File(dir, hash+".tmp"); temp.writeBytes(bytes); check(temp.renameTo(file))
                var total = 0L
                dir.listFiles()?.filter { it.extension == "mp3" }?.sortedByDescending { it.lastModified() }?.forEach {
                    total += it.length(); if (total > 32_000_000) it.delete()
                }
                audio(bytes, false)
            }
        } catch (_: Exception) {
            prefs.edit().putLong("retryAt", now+60000).apply()
            fallback("Azure lỗi hoặc mất mạng · dùng giọng trên máy.")
        } finally { connection?.disconnect() }
    }
}
