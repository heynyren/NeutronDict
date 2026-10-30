package com.neutrondict.app.media

import android.content.Context
import com.kienhoang.dualsubreplay.R
import com.kienhoang.dualsubreplay.ui.NeutronInterface

/** Localize fixed integration messages at the display boundary, preserving source content. */
object NeutronUiStrings {
    private val ids=mapOf(
        "Chưa lưu được màu. Hãy chọn lại." to R.string.rakulang_theme_error,
        "Đào" to R.string.rakulang_color_peach,
        "RaKuLanG · Sổ tay và đọc báo" to R.string.rakulang_notebook,
        "‹ RaKuLanG" to R.string.rakulang_return,
        "Tra RaKuLanG" to R.string.rakulang_lookup,
        "Đang mở bài…" to R.string.rakulang_opening,
        "Bản đã lưu trên máy" to R.string.rakulang_offline,
        "Chưa mở được bài. Kiểm tra mạng hoặc bấm tải lại." to R.string.rakulang_open_error,
        "Trang đã đóng để giải phóng bộ nhớ. Hãy mở lại bài." to R.string.rakulang_page_closed,
        "Tải lại" to R.string.rakulang_reload,
        "Dễ đọc" to R.string.rakulang_readable,
        "Lưu bài" to R.string.rakulang_save_article,
        "Đã lưu vào sổ tay NeutronDict" to R.string.rakulang_saved_word,
        "Bôi đen từ rồi bấm Tra NeutronDict." to R.string.rakulang_select_word,
        "Chưa tra được từ." to R.string.rakulang_lookup_error,
        "Chưa lấy được nội dung bài." to R.string.rakulang_article_empty,
        "Không lưu được bài." to R.string.rakulang_save_error,
        "Đã lưu bài để đọc ngoại tuyến" to R.string.rakulang_article_saved,
        "Mở lại NeutronDict rồi thử tra lại." to R.string.rakulang_reopen,
        "Tra từ chưa phản hồi. Kiểm tra mạng và thử lại." to R.string.rakulang_lookup_timeout,
        "Không lưu được cấu hình giọng đọc." to R.string.rakulang_voice_error,
        "Đường dẫn YouTube không hợp lệ." to R.string.rakulang_youtube_url,
        "Chỉ mở địa chỉ HTTPS." to R.string.rakulang_https_only,
        "Nguồn tin phải là địa chỉ Internet công khai." to R.string.rakulang_public_feed,
        "Đường dẫn nguồn không hợp lệ." to R.string.rakulang_feed_url,
        "Tối đa 12 nguồn tin." to R.string.rakulang_feed_limit,
        "Chu kỳ không hợp lệ." to R.string.rakulang_feed_interval,
        "Nguồn RSS phải dùng HTTPS." to R.string.rakulang_feed_https,
        "Mã ngôn ngữ không hợp lệ." to R.string.rakulang_language_code,
        "Không lưu được nguồn." to R.string.rakulang_save_feed,
        "Chưa tải được nguồn." to R.string.rakulang_load_feed,
        "Không lưu được tin." to R.string.rakulang_save_news,
        "Nguồn vượt giới hạn 4 MB." to R.string.rakulang_feed_size,
        "XML không an toàn hoặc quá lớn." to R.string.rakulang_xml_unsafe,
        "XML chứa DTD." to R.string.rakulang_xml_dtd,
        "Bài báo không hợp lệ." to R.string.rakulang_article_invalid,
        "Đã có 200 bài đánh dấu. Hãy bỏ bớt bài cũ." to R.string.rakulang_bookmark_limit,
        "Mã vùng Azure không hợp lệ." to R.string.rakulang_azure_region,
        "Khóa Azure không hợp lệ." to R.string.rakulang_azure_key,
        "Đang dùng giọng trên máy." to R.string.rakulang_device_voice,
        "Azure tạm hết lượt hoặc chưa khả dụng · dùng giọng trên máy." to R.string.rakulang_azure_retry,
        "Đã chạm giới hạn Azure của app tháng này · dùng giọng trên máy." to R.string.rakulang_azure_limit,
        "Chưa có khóa Azure hợp lệ · dùng giọng trên máy." to R.string.rakulang_azure_missing,
        "Vùng Azure không hợp lệ." to R.string.rakulang_azure_bad_region,
        "Azure chưa khả dụng · dùng giọng trên máy." to R.string.rakulang_azure_unavailable,
        "Audio không hợp lệ." to R.string.rakulang_audio_invalid,
        "Azure lỗi hoặc mất mạng · dùng giọng trên máy." to R.string.rakulang_azure_network
    )
    @JvmStatic fun text(context:Context,key:String?):String {
        val message=key.orEmpty()
        val id=ids[message] ?: return message
        return NeutronInterface.wrap(context).getString(id)
    }
}
