package com.neutrondict.app.media;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import android.widget.EditText;
import java.net.URI;
/** Reject auth pages and password editors before taking any AI screenshot. */
public final class ScreenPrivacy {
    public static boolean canCapture(View view) {
        if (view instanceof WebView) {
            String url = ((WebView)view).getUrl();
            try {
                URI uri = new URI(url == null ? "" : url);
                String host = uri.getHost();
                // Captures are permitted only on a YouTube content origin, never localhost/settings/auth.
                if (!"https".equals(uri.getScheme()) || host == null ||
                    !(host.equals("youtube.com") || host.endsWith(".youtube.com")) ||
                    host.startsWith("accounts.") || uri.getPath().toLowerCase().contains("signin") ||
                    uri.getPath().toLowerCase().contains("login")) return false;
            } catch (Exception e) { return false; }
        }
        if (view instanceof EditText) {
            int variation = ((EditText)view).getInputType() & 0xfff;
            if (variation == 129 || variation == 145 || variation == 225 || variation == 18) return false;
        }
        if (view instanceof ViewGroup) {
            ViewGroup group = (ViewGroup)view;
            for (int i=0; i<group.getChildCount(); i++) if (!canCapture(group.getChildAt(i))) return false;
        }
        return true;
    }
}
