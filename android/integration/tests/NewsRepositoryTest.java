package com.neutrondict.app.media;
import org.junit.Test;
import org.json.JSONObject;
import static org.junit.Assert.*;
public class NewsRepositoryTest {
    private JSONObject feed() throws Exception { return new JSONObject().put("url","https://example.org/feed").put("title","News").put("language","ja"); }
    @Test public void readsRssAndAtomAndRejectsUnsafeLinks() throws Exception {
        var rss=NewsRepository.parse("<rss><channel><item><title>日本語 &amp; English</title><link>https://example.org/a</link></item><item><title>bad</title><link>javascript:alert(1)</link></item></channel></rss>",feed());
        assertEquals(1,rss.size());assertEquals("日本語 & English",rss.get(0).getString("title"));
        var atom=NewsRepository.parse("<feed xmlns='http://www.w3.org/2005/Atom'><entry><title>Actualités</title><link rel='self' href='https://example.org/wrong'/><link rel='alternate' href='/article'/></entry></feed>",feed());
        assertEquals("https://example.org/article",atom.get(0).getString("url"));
    }
    @Test public void rejectsDtdAndLocalSchemes() throws Exception {
        assertFalse(NewsRepository.validUrl("javascript:alert(1)"));
        assertFalse(NewsRepository.validUrl("file:///etc/passwd"));
        assertFalse(NewsRepository.validUrl("https://user:password@example.org/a"));
        assertFalse(NewsRepository.validUrl("https://localhost/feed"));
        try { NewsRepository.parse("<!DOCTYPE rss [<!ENTITY e SYSTEM 'file:///etc/passwd'>]><rss/>",feed());fail("DTD accepted"); }
        catch(java.io.IOException expected) {}
    }
}
