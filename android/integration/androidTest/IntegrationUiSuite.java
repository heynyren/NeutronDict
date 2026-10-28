package com.neutrondict.app.media;
import org.junit.runner.RunWith;
import org.junit.runners.Suite;
@RunWith(Suite.class)
@Suite.SuiteClasses({
    IntegrationSmokeTest.class,
    com.kienhoang.dualsubreplay.ui.WordLearningDialogTest.class,
    com.kienhoang.dualsubreplay.ui.AiAssistantPanelUiTest.class
})
public class IntegrationUiSuite {}
