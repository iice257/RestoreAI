import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Linking from "expo-linking";
import * as MediaLibrary from "expo-media-library";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  Switch,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { sampleImages } from "./assets";
import {
  appendExport,
  appendStage,
  consumeCredit,
  createImportedProject,
  createLocalPhotoProject,
  formatDisplayDate,
  getActiveStage,
  getRemainingCredits,
  hasAvailableCredits,
  replaceProject,
} from "./domain/projects";
import { getSignInMessage, isSignedIn } from "./domain/auth";
import {
  canUseExportFormat,
  canUseTool,
  getAllowedExportFormat,
  getExportEntitlementMessage,
  getToolEntitlementMessage,
} from "./domain/entitlements";
import { billingClient, createDemoProject, defaultAccount, defaultPrefs, imageWorkflowClient, authClient } from "./services/restoreai-client";
import type { AuthResult } from "./services/contracts";
import { clearState, initializeDatabase, loadState, saveState } from "./storage";
import { colors, radii } from "./theme";
import type { Account, AppPreferences, EditStage, Project, ToolType } from "./types";

type Screen =
  | "splash"
  | "onboarding"
  | "login"
  | "home"
  | "import"
  | "workflow"
  | "processing"
  | "comparison"
  | "export"
  | "library"
  | "detail"
  | "settings"
  | "account"
  | "offline"
  | "permission"
  | "empty"
  | "error"
  | "privacy";

type AppIconName =
  | "restore"
  | "upscale"
  | "extend"
  | "recolor"
  | "home"
  | "import"
  | "library"
  | "settings"
  | "account"
  | "back"
  | "close"
  | "tips"
  | "export"
  | "camera"
  | "photos"
  | "files"
  | "samples"
  | "shield"
  | "save"
  | "share"
  | "edit"
  | "details"
  | "check"
  | "lock";

type WorkflowOption = { key: string; icon: AppIconName; title: string; body: string };

const toolCopy: Record<ToolType, { title: string; icon: AppIconName; body: string; accent: string }> = {
  restore: { title: "Restore", icon: "restore", body: "Repair damage and recover tone", accent: colors.teal },
  upscale: { title: "Upscale", icon: "upscale", body: "Enlarge without harsh edges", accent: colors.amber },
  extend: { title: "Extend", icon: "extend", body: "Adjust aspect and preserve subject", accent: colors.teal },
  recolor: { title: "Recolor", icon: "recolor", body: "Add natural color to B&W photos", accent: colors.garnet },
};

export default function RestoreAIApp() {
  return (
    <SafeAreaProvider>
      <RestoreAIRoot />
    </SafeAreaProvider>
  );
}

function RestoreAIRoot() {
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState<Screen>("splash");
  const [account, setAccount] = useState<Account>(defaultAccount);
  const [prefs, setPrefs] = useState<AppPreferences>(defaultPrefs);
  const [projects, setProjects] = useState<Project[]>([createDemoProject()]);
  const [selectedProjectId, setSelectedProjectId] = useState("project-family-1946");
  const [selectedTool, setSelectedTool] = useState<ToolType>("restore");
  const [postLoginScreen, setPostLoginScreen] = useState<Screen>("home");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const incomingAuthUrl = Linking.useURL();

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0];
  const currentStage = getActiveStage(selectedProject);

  useEffect(() => {
    let mounted = true;
    initializeDatabase().catch(() => undefined);
    loadState()
      .then((state) => {
        if (!mounted) return;
        if (state) {
          setAccount(state.account);
          setPrefs(state.prefs);
          setProjects(state.projects.length ? state.projects : [createDemoProject()]);
          setSelectedProjectId(state.projects[0]?.id ?? "project-family-1946");
          setScreen(state.prefs.onboardingComplete ? "home" : "onboarding");
        } else {
          setTimeout(() => mounted && setScreen("onboarding"), 700);
        }
      })
      .catch(() => setTimeout(() => mounted && setScreen("onboarding"), 700));
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (screen === "splash") return;
    saveState({ account, prefs, projects }).catch(() => undefined);
  }, [account, prefs, projects, screen]);

  useEffect(() => {
    const getCurrentAccount = authClient.getCurrentAccount;
    if (!getCurrentAccount) return;
    let mounted = true;
    getCurrentAccount()
      .then((nextAccount) => {
        if (mounted && isSignedIn(nextAccount)) setAccount(nextAccount);
      })
      .catch((error) => {
        if (mounted) setMessage(error instanceof Error ? error.message : "Unable to restore the current session.");
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handleAuthCallback = authClient.handleAuthCallback;
    if (!incomingAuthUrl || !handleAuthCallback) return;
    let mounted = true;
    handleAuthCallback(incomingAuthUrl)
      .then((result) => {
        if (mounted && result) handleAuthResult(result);
      })
      .catch((error) => {
        if (mounted) setMessage(error instanceof Error ? error.message : "Unable to complete sign-in.");
      });
    return () => {
      mounted = false;
    };
  }, [incomingAuthUrl]);

  function navigate(next: Screen, options: { preserveMessage?: boolean } = {}) {
    Haptics.selectionAsync().catch(() => undefined);
    if (!options.preserveMessage) setMessage("");
    setScreen(next);
  }

  function showUpgrade(messageText: string) {
    setMessage(messageText);
    navigate("account", { preserveMessage: true });
  }

  function requireSignIn(messageText: string, nextScreen: Screen = "home") {
    setPostLoginScreen(nextScreen);
    setMessage(messageText);
    navigate("login", { preserveMessage: true });
  }

  function handleAuthResult(result: AuthResult) {
    setAccount(result.account);

    if (result.requiresVerification) {
      setMessage(result.notice ?? "Check your email to finish signing in.");
      navigate("login", { preserveMessage: true });
      return;
    }

    const nextScreen = postLoginScreen;
    setPostLoginScreen("home");
    if (result.notice) setMessage(result.notice);
    navigate(nextScreen, { preserveMessage: Boolean(result.notice) });
  }

  function updateProject(nextProject: Project) {
    setProjects((items) => replaceProject(items, nextProject));
    setSelectedProjectId(nextProject.id);
  }

  function selectTool(tool: ToolType) {
    if (!isSignedIn(account)) {
      requireSignIn(getSignInMessage("tool"), "home");
      return;
    }
    if (!canUseTool(account, tool)) {
      showUpgrade(getToolEntitlementMessage(tool));
      return;
    }
    setSelectedTool(tool);
    navigate("workflow");
  }

  function importSample(asset: Project["sourceAsset"] = "portrait") {
    const next = createImportedProject(asset);
    setProjects((items) => [next, ...items]);
    setSelectedProjectId(next.id);
    navigate("workflow");
  }

  function importPickedImage(sourceUri: string, fallbackAsset: Project["sourceAsset"]) {
    const next = createLocalPhotoProject(sourceUri, fallbackAsset);
    setProjects((items) => [next, ...items]);
    setSelectedProjectId(next.id);
    navigate("workflow");
  }

  async function pickImage(source: "camera" | "library" | "files") {
    if (!isSignedIn(account)) {
      requireSignIn(getSignInMessage("import"), "import");
      return;
    }
    setBusy(true);
    try {
      const permission =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        navigate("permission");
        return;
      }
      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.9 })
          : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.9 });

      if (result.canceled || !result.assets[0]?.uri) return;

      importPickedImage(result.assets[0].uri, source === "files" ? "archive" : "portrait");
    } finally {
      setBusy(false);
    }
  }

  async function startProcessing(settings: EditStage["settings"], forceConsent = false) {
    if (!isSignedIn(account)) {
      requireSignIn(getSignInMessage("process"), "workflow");
      return;
    }
    if (!canUseTool(account, selectedTool)) {
      showUpgrade(getToolEntitlementMessage(selectedTool));
      return;
    }
    if (!hasAvailableCredits(account)) {
      setMessage("Credits are out for this cycle. Upgrade or retry after reset.");
      navigate("error");
      return;
    }
    if (prefs.offlineMode) {
      navigate("offline");
      return;
    }
    const effectivePrefs = forceConsent ? { ...prefs, privacyConsent: true } : prefs;
    if (!effectivePrefs.privacyConsent) {
      navigate("privacy");
      return;
    }
    setProgress(0);
    navigate("processing");
    const timer = setInterval(() => setProgress((value) => Math.min(value + 17, 94)), 260);
    try {
      const stage = await imageWorkflowClient.processStage(selectedProject, selectedTool, settings, effectivePrefs);
      clearInterval(timer);
      setProgress(100);
      const nextProject = appendStage(selectedProject, stage);
      updateProject(nextProject);
      setAccount(consumeCredit);
      setTimeout(() => navigate("comparison"), 350);
    } catch (error) {
      clearInterval(timer);
      setMessage(error instanceof Error ? error.message : "Processing failed.");
      navigate("error");
    }
  }

  async function exportCurrent() {
    if (!isSignedIn(account)) {
      requireSignIn(getSignInMessage("export"), "comparison");
      return;
    }
    if (!canUseExportFormat(account, prefs.exportFormat)) {
      showUpgrade(getExportEntitlementMessage(prefs.exportFormat));
      return;
    }
    setBusy(true);
    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
      const exported = await imageWorkflowClient.exportStage(selectedProject, prefs.exportFormat);
      updateProject(appendExport(selectedProject, exported));
      if (!permission.granted) {
        setMessage("Export variant created. Media permission is needed to save to the device.");
      } else {
        setMessage("Export variant saved to your RestoreAI library.");
      }
      navigate("export");
    } finally {
      setBusy(false);
    }
  }

  function setActiveStage(stageId: string) {
    updateProject({ ...selectedProject, activeStageId: stageId });
  }

  async function resetDemo() {
    await clearState();
    setAccount(defaultAccount);
    setPrefs(defaultPrefs);
    const demo = createDemoProject();
    setProjects([demo]);
    setSelectedProjectId(demo.id);
    navigate("onboarding");
  }

  function selectExportFormat(format: AppPreferences["exportFormat"]) {
    if (!canUseExportFormat(account, format)) {
      showUpgrade(getExportEntitlementMessage(format));
      return;
    }
    setPrefs({ ...prefs, exportFormat: format });
  }

  const content = {
    splash: <SplashScreen />,
    onboarding: <OnboardingScreen prefs={prefs} setPrefs={setPrefs} goLogin={() => requireSignIn("", "home")} goHome={() => navigate("home")} />,
    login: (
      <LoginScreen
        busy={busy}
        message={message}
        setBusy={setBusy}
        setMessage={setMessage}
        onAuthResult={handleAuthResult}
        goHome={() => navigate("home")}
      />
    ),
    home: <HomeScreen account={account} project={selectedProject} selectTool={selectTool} navigate={navigate} setActiveStage={setActiveStage} />,
    import: <ImportScreen busy={busy} pickImage={pickImage} importSample={importSample} navigate={navigate} />,
    workflow: <WorkflowScreen tool={selectedTool} project={selectedProject} stage={currentStage} startProcessing={startProcessing} setActiveStage={setActiveStage} navigate={navigate} />,
    processing: <ProcessingScreen progress={progress} tool={selectedTool} project={selectedProject} navigate={navigate} />,
    comparison: <ComparisonScreen project={selectedProject} stage={currentStage} setActiveStage={setActiveStage} exportCurrent={exportCurrent} selectTool={selectTool} navigate={navigate} />,
    export: <ExportScreen account={account} project={selectedProject} stage={currentStage} prefs={prefs} selectExportFormat={selectExportFormat} message={message} busy={busy} exportCurrent={exportCurrent} navigate={navigate} />,
    library: <LibraryScreen projects={projects} setProjects={setProjects} setSelectedProjectId={setSelectedProjectId} navigate={navigate} />,
    detail: <DetailScreen project={selectedProject} setActiveStage={setActiveStage} selectTool={selectTool} exportCurrent={exportCurrent} navigate={navigate} />,
    settings: <SettingsScreen account={account} prefs={prefs} setPrefs={setPrefs} navigate={navigate} resetDemo={resetDemo} />,
    account: <AccountScreen account={account} message={message} setAccount={setAccount} setMessage={setMessage} setPrefs={setPrefs} navigate={navigate} />,
    offline: <StateScreen title="Work is still here" body="Your library stays available. Processing resumes when the connection returns." action="Review library" onAction={() => navigate("library")} />,
    permission: <StateScreen title="Access is blocked" body="Grant photo access or use sample images to keep working." action="Use samples" onAction={() => importSample("portrait")} />,
    empty: <StateScreen title="No projects yet" body="Start with a sample archive photo or import one of your own." action="Import photo" onAction={() => navigate("import")} />,
    error: <StateScreen title="Processing paused" body={message || "The job stopped before a result was created. Your source and settings were preserved."} action="Back to edit" onAction={() => navigate("workflow")} />,
    privacy: <PrivacyScreen prefs={prefs} setPrefs={setPrefs} onContinue={() => startProcessing({ consented: true }, true)} navigate={navigate} />,
  }[screen];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="light" />
      {content}
      {["home", "import", "library", "settings"].includes(screen) ? <BottomTabs active={screen} navigate={navigate} bottom={insets.bottom} /> : null}
    </View>
  );
}

function stageImageSource(stage: Pick<EditStage, "outputAsset" | "outputUri">) {
  return stage.outputUri ? { uri: stage.outputUri } : sampleImages[stage.outputAsset];
}

function IconPrimitive({ name, color = colors.amber, size = 28, style }: { name: AppIconName; color?: string; size?: number; style?: object }) {
  const stroke = Math.max(2, Math.round(size / 12));
  const line = {
    position: "absolute" as const,
    height: stroke,
    borderRadius: stroke,
    backgroundColor: color,
  };
  const dotStyle = (diameter: number, extra?: object) => ({
    position: "absolute" as const,
    width: diameter,
    height: diameter,
    borderRadius: 99,
    backgroundColor: color,
    ...extra,
  });
  const box = [styles.iconGlyph, { width: size, height: size }, style];

  if (name === "back") {
    return (
      <View style={box}>
        <View style={[line, { width: size * 0.52, left: size * 0.2, top: size * 0.34, transform: [{ rotate: "-42deg" }] }]} />
        <View style={[line, { width: size * 0.52, left: size * 0.2, top: size * 0.62, transform: [{ rotate: "42deg" }] }]} />
      </View>
    );
  }

  if (name === "close") {
    return (
      <View style={box}>
        <View style={[line, { width: size * 0.62, left: size * 0.19, top: size * 0.49, transform: [{ rotate: "45deg" }] }]} />
        <View style={[line, { width: size * 0.62, left: size * 0.19, top: size * 0.49, transform: [{ rotate: "-45deg" }] }]} />
      </View>
    );
  }

  if (name === "upscale" || name === "export") {
    return (
      <View style={box}>
        <View style={[line, { width: size * 0.58, left: size * 0.23, top: name === "export" ? size * 0.32 : size * 0.42, transform: [{ rotate: "-45deg" }] }]} />
        <View style={[line, { width: size * 0.26, right: size * 0.16, top: name === "export" ? size * 0.18 : size * 0.28 }]} />
        <View style={[line, { width: size * 0.26, right: size * 0.04, top: name === "export" ? size * 0.29 : size * 0.39, transform: [{ rotate: "90deg" }] }]} />
        {name === "export" ? <View style={[line, { width: size * 0.66, left: size * 0.17, bottom: size * 0.13 }]} /> : null}
      </View>
    );
  }

  if (name === "restore" || name === "tips") {
    return (
      <View style={box}>
        <View style={[line, { width: size * 0.7, left: size * 0.15, top: size * 0.49 }]} />
        <View style={[line, { width: size * 0.7, left: size * 0.15, top: size * 0.49, transform: [{ rotate: "90deg" }] }]} />
        <View style={[line, { width: size * 0.48, left: size * 0.26, top: size * 0.49, transform: [{ rotate: "45deg" }] }]} />
        <View style={[line, { width: size * 0.48, left: size * 0.26, top: size * 0.49, transform: [{ rotate: "-45deg" }] }]} />
      </View>
    );
  }

  if (name === "extend" || name === "photos" || name === "library") {
    return (
      <View style={box}>
        <View style={[styles.iconFrame, { width: size * 0.7, height: size * 0.58, left: size * 0.18, top: size * 0.22, borderColor: color, borderWidth: stroke }]} />
        {name !== "extend" ? <View style={[styles.iconFrame, { width: size * 0.52, height: size * 0.44, left: size * 0.08, top: size * 0.12, borderColor: color, borderWidth: stroke, opacity: 0.55 }]} /> : null}
      </View>
    );
  }

  if (name === "recolor") {
    return (
      <View style={box}>
        <View style={[styles.iconCircle, { width: size * 0.72, height: size * 0.72, left: size * 0.14, top: size * 0.14, borderColor: color, borderWidth: stroke }]} />
        <View style={dotStyle(size * 0.28, { left: size * 0.36, top: size * 0.36, opacity: 0.72 })} />
      </View>
    );
  }

  if (name === "camera") {
    return (
      <View style={box}>
        <View style={[styles.iconFrame, { width: size * 0.76, height: size * 0.54, left: size * 0.12, top: size * 0.28, borderColor: color, borderWidth: stroke }]} />
        <View style={[styles.iconCircle, { width: size * 0.28, height: size * 0.28, left: size * 0.36, top: size * 0.41, borderColor: color, borderWidth: stroke }]} />
        <View style={[line, { width: size * 0.24, left: size * 0.25, top: size * 0.2 }]} />
      </View>
    );
  }

  if (name === "files" || name === "save") {
    return (
      <View style={box}>
        <View style={[styles.iconFrame, { width: size * 0.58, height: size * 0.72, left: size * 0.21, top: size * 0.12, borderColor: color, borderWidth: stroke }]} />
        <View style={[line, { width: size * 0.34, left: size * 0.33, top: size * 0.38 }]} />
        <View style={[line, { width: size * 0.34, left: size * 0.33, top: size * 0.56 }]} />
      </View>
    );
  }

  if (name === "import") {
    return (
      <View style={box}>
        <View style={[line, { width: size * 0.52, left: size * 0.24, top: size * 0.68 }]} />
        <View style={[line, { width: size * 0.42, left: size * 0.29, top: size * 0.4, transform: [{ rotate: "90deg" }] }]} />
        <View style={[line, { width: size * 0.26, left: size * 0.29, top: size * 0.52, transform: [{ rotate: "42deg" }] }]} />
        <View style={[line, { width: size * 0.26, right: size * 0.29, top: size * 0.52, transform: [{ rotate: "-42deg" }] }]} />
      </View>
    );
  }

  if (name === "share" || name === "samples") {
    return (
      <View style={box}>
        <View style={[line, { width: size * 0.42, left: size * 0.31, top: size * 0.36, transform: [{ rotate: "-24deg" }], opacity: 0.7 }]} />
        <View style={[line, { width: size * 0.42, left: size * 0.31, top: size * 0.6, transform: [{ rotate: "24deg" }], opacity: 0.7 }]} />
        <View style={dotStyle(size * 0.18, { left: size * 0.14, top: size * 0.42 })} />
        <View style={dotStyle(size * 0.18, { right: size * 0.14, top: size * 0.22 })} />
        <View style={dotStyle(size * 0.18, { right: size * 0.14, bottom: size * 0.18 })} />
      </View>
    );
  }

  if (name === "edit") {
    return (
      <View style={box}>
        <View style={[line, { width: size * 0.66, left: size * 0.22, top: size * 0.5, transform: [{ rotate: "-36deg" }] }]} />
        <View style={[line, { width: size * 0.36, left: size * 0.2, bottom: size * 0.17 }]} />
      </View>
    );
  }

  if (name === "home") {
    return (
      <View style={box}>
        <View style={[line, { width: size * 0.52, left: size * 0.24, top: size * 0.34, transform: [{ rotate: "-34deg" }] }]} />
        <View style={[line, { width: size * 0.52, right: size * 0.24, top: size * 0.34, transform: [{ rotate: "34deg" }] }]} />
        <View style={[styles.iconFrame, { width: size * 0.48, height: size * 0.42, left: size * 0.26, top: size * 0.42, borderColor: color, borderWidth: stroke }]} />
      </View>
    );
  }

  if (name === "settings" || name === "account" || name === "details" || name === "shield" || name === "check" || name === "lock") {
    return (
      <View style={box}>
        <View style={[styles.iconCircle, { width: size * 0.68, height: size * 0.68, left: size * 0.16, top: size * 0.16, borderColor: color, borderWidth: stroke }]} />
        <View style={dotStyle(name === "check" ? size * 0.16 : size * 0.25, { left: size * 0.38, top: size * 0.38 })} />
      </View>
    );
  }

  return (
    <View style={box}>
      <View style={[styles.iconCircle, { width: size * 0.7, height: size * 0.7, left: size * 0.15, top: size * 0.15, borderColor: color, borderWidth: stroke }]} />
    </View>
  );
}

function SplashScreen() {
  return (
    <View style={{ flex: 1, justifyContent: "flex-end", alignItems: "center", padding: 34, paddingBottom: 105, backgroundColor: colors.black }}>
      <Image source={sampleImages.family} contentFit="cover" style={{ position: "absolute", inset: 0, opacity: 0.68 }} />
      <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.34)" }} />
      <View style={{ position: "absolute", top: 0, bottom: 0, width: 2, backgroundColor: colors.amber, opacity: 0.75 }} />
      <Animated.View entering={FadeIn.duration(700)} style={{ alignItems: "center", gap: 10 }}>
        <IconPrimitive name="restore" color={colors.amber} size={54} />
        <Text selectable style={brandTitle}>Restore<Text style={{ color: colors.amber }}>AI</Text></Text>
      </Animated.View>
    </View>
  );
}

function OnboardingScreen({ prefs, setPrefs, goLogin, goHome }: { prefs: AppPreferences; setPrefs: (prefs: AppPreferences) => void; goLogin: () => void; goHome: () => void }) {
  return (
    <ScreenScroll flush>
      <View style={mockStatusRow}>
        <Text style={mockStatusText}>9:41</Text>
        <Text style={mockStatusText}>LTE  100%</Text>
      </View>
      <Pressable onPress={goHome} style={{ alignSelf: "flex-end", paddingHorizontal: 14, paddingVertical: 4 }}>
        <Text selectable style={{ color: colors.text, fontSize: 14 }}>Skip</Text>
      </Pressable>
      <Text selectable style={[titleStyle, { textAlign: "center", fontSize: 34, lineHeight: 42, marginTop: 10 }]}>
        Bring your{"\n"}<Text style={{ color: colors.amber }}>memories</Text> back
      </Text>
      <View style={{ height: 330, marginTop: 12, justifyContent: "center", alignItems: "center" }}>
        <Image source={sampleImages.archive} contentFit="cover" style={[photoStack, { transform: [{ rotate: "-8deg" }, { translateX: -36 }] }]} />
        <Image source={sampleImages.family} contentFit="cover" style={[photoStack, { transform: [{ rotate: "8deg" }, { translateX: 34 }, { translateY: 10 }] }]} />
        <Image source={sampleImages.portrait} contentFit="cover" style={[photoStack, { width: 230, height: 250 }]} />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-around", marginTop: 8 }}>
        <OnboardingTool icon="restore" title="Restore" body="Repair damage and detail" />
        <OnboardingTool icon="upscale" title="Enlarge" body="Upscale without losing quality" />
        <OnboardingTool icon="recolor" title="Recolor" body="Add natural colors" />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 22 }}>
        <View style={dotActive} />
        <View style={dot} />
        <View style={dot} />
      </View>
      <PrimaryButton
        label="Get Started"
        onPress={() => {
          setPrefs({ ...prefs, onboardingComplete: true });
          goLogin();
        }}
      />
      <Pressable onPress={goHome} style={{ alignItems: "center", padding: 8 }}>
        <Text selectable style={{ color: colors.teal, fontSize: 16 }}>Continue as Demo</Text>
      </Pressable>
    </ScreenScroll>
  );
}

function LoginScreen({
  busy,
  message,
  setBusy,
  setMessage,
  onAuthResult,
  goHome,
}: {
  busy: boolean;
  message: string;
  setBusy: (busy: boolean) => void;
  setMessage: (message: string) => void;
  onAuthResult: (result: AuthResult) => void;
  goHome: () => void;
}) {
  const [email, setEmail] = useState("demo@restoreai.local");
  async function submit() {
    if (!email.trim()) {
      setMessage("Enter an email address to continue.");
      return;
    }

    setBusy(true);
    try {
      const result = await authClient.signIn(email);
      onAuthResult(result);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sign-in failed. Try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScreenScroll flush>
      <View style={mockStatusRow}>
        <Text style={mockStatusText}>9:41</Text>
        <Text style={mockStatusText}>LTE  100%</Text>
      </View>
      <IconPrimitive name="restore" color={colors.amber} size={54} style={{ alignSelf: "center", marginTop: 22 }} />
      <Text selectable style={[titleStyle, { textAlign: "center", marginTop: 8 }]}>Welcome back</Text>
      <View style={{ height: 230, marginTop: 20, alignItems: "center" }}>
        <Image source={sampleImages.family} contentFit="cover" style={[photoStack, { width: 250, height: 185, transform: [{ rotate: "-8deg" }, { translateX: -20 }] }]} />
        <Image source={sampleImages.archive} contentFit="cover" style={[photoStack, { width: 250, height: 185, transform: [{ rotate: "7deg" }, { translateX: 18 }, { translateY: 18 }] }]} />
      </View>
      <Panel raised>
        {message ? <Text selectable style={bodyStyle}>{message}</Text> : null}
        <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.stroke }}>
          <Text selectable style={[sectionTitle, { flex: 1, textAlign: "center", color: colors.amber, paddingBottom: 12 }]}>Log In</Text>
          <Text selectable style={[sectionTitle, { flex: 1, textAlign: "center", color: colors.muted, paddingBottom: 12 }]}>Sign Up</Text>
        </View>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Email"
          placeholderTextColor={colors.dim}
          style={inputStyle}
        />
        <PrimaryButton label={busy ? "Opening archive..." : "Continue"} onPress={submit} disabled={busy} />
        <Text selectable style={{ color: colors.muted, textAlign: "center" }}>or continue with</Text>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <SecondaryButton compact label="Apple" onPress={submit} />
          <SecondaryButton compact label="Google" onPress={submit} />
          <SecondaryButton compact label="Email" onPress={submit} />
        </View>
        <Pressable onPress={goHome} style={{ alignItems: "center", paddingTop: 8 }}>
          <Text selectable style={{ color: colors.teal, fontSize: 16 }}>Continue as Demo</Text>
        </Pressable>
      </Panel>
    </ScreenScroll>
  );
}

function OnboardingTool({ icon, title, body }: { icon: AppIconName; title: string; body: string }) {
  return (
    <View style={{ width: "30%", alignItems: "center", gap: 8 }}>
      <IconPrimitive name={icon} color={colors.amber} size={34} />
      <Text selectable style={[sectionTitle, { fontFamily: "Georgia", fontSize: 17, textAlign: "center" }]}>{title}</Text>
      <Text selectable style={{ color: colors.muted, textAlign: "center", fontSize: 13, lineHeight: 18 }}>{body}</Text>
    </View>
  );
}

function HomeScreen({ account, project, selectTool, navigate, setActiveStage }: { account: Account; project: Project; selectTool: (tool: ToolType) => void; navigate: (screen: Screen) => void; setActiveStage: (id: string) => void }) {
  const stage = getActiveStage(project);
  return (
    <ScreenScroll withBottom>
      <Header title="RestoreAI" leftLabel="" rightLabel={account.plan === "Archive Pro" ? "Pro" : "Crown"} onRight={() => navigate("account")} />
      <SectionHeader label="Recent project" action="See all" onPress={() => navigate("library")} />
      <Pressable onPress={() => navigate("comparison")} style={styles.heroCard}>
        <Image source={stageImageSource(stage)} contentFit="cover" style={styles.heroImage} />
        <View style={styles.beforeAfterLine} />
        <Badge label="Before" style={{ left: 18, top: 18 }} />
        <Badge label="After" style={{ right: 18, top: 18, backgroundColor: "rgba(45,124,126,0.8)" }} />
        <View style={{ position: "absolute", left: 20, bottom: 20 }}>
          <Text selectable style={{ color: colors.text, fontSize: 28 }}>{project.title} - {project.year}</Text>
          <Text selectable style={{ color: colors.muted, fontSize: 15 }}>{stage.title} - {project.stages.length - 1} edits</Text>
        </View>
      </Pressable>
      <SectionHeader label="Tools" />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {(Object.keys(toolCopy) as ToolType[]).map((tool) => (
          <ToolCard key={tool} tool={tool} onPress={() => selectTool(tool)} />
        ))}
      </View>
      <UsageStrip account={account} />
      <Panel row>
        <Image source={sampleImages.archive} style={{ width: 96, height: 74, borderRadius: radii.md }} contentFit="cover" />
        <View style={{ flex: 1, gap: 8 }}>
          <Text selectable style={sectionTitle}>Bring this memory back to life</Text>
          <Text selectable style={bodyStyle}>Try a balanced restore from the current stage.</Text>
          <PrimaryButton compact label="Try Smart Restore" onPress={() => selectTool("restore")} />
        </View>
        <IconButton label="Close" onPress={() => setActiveStage(project.stages[0].id)} />
      </Panel>
    </ScreenScroll>
  );
}

function ImportScreen({ busy, pickImage, importSample, navigate }: { busy: boolean; pickImage: (source: "camera" | "library" | "files") => void; importSample: (asset?: Project["sourceAsset"]) => void; navigate: (screen: Screen) => void }) {
  return (
    <ScreenScroll withBottom>
      <Header title="RestoreAI" leftLabel="<" onLeft={() => navigate("home")} rightLabel="Crown" onRight={() => navigate("account")} />
      <Text selectable style={titleStyle}>Import Your Photo</Text>
      <Text selectable style={bodyStyle}>Start with a memory we can bring back to life.</Text>
      <Pressable onPress={() => importSample("portrait")} style={styles.dropZone}>
        {busy ? <ActivityIndicator color={colors.amber} /> : <IconPrimitive name="import" size={52} color={colors.amber} />}
        <Text selectable style={[sectionTitle, { fontSize: 28 }]}>Add a photo</Text>
        <Text selectable style={bodyStyle}>Tap a source below or try a sample.</Text>
      </Pressable>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <ImportChoice icon="camera" title="Camera" subtitle="Take a new photo" onPress={() => pickImage("camera")} />
        <ImportChoice icon="photos" title="Photo Library" subtitle="Choose from gallery" onPress={() => pickImage("library")} />
        <ImportChoice icon="files" title="Files" subtitle="From device" onPress={() => pickImage("files")} />
        <ImportChoice icon="samples" title="Sample Images" subtitle="Try examples" onPress={() => importSample("archive")} />
      </View>
      <SectionHeader label="Try a sample" action="See all" onPress={() => navigate("library")} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
        {(["portrait", "archive", "family"] as Project["sourceAsset"][]).map((asset) => (
          <Pressable key={asset} onPress={() => importSample(asset)}>
            <Image source={sampleImages[asset]} style={{ width: 142, height: 142, borderRadius: radii.md }} contentFit="cover" />
          </Pressable>
        ))}
      </ScrollView>
      <Panel row>
        <View style={styles.shield}><IconPrimitive name="shield" color={colors.teal} size={34} /></View>
        <View style={{ flex: 1 }}>
          <Text selectable style={sectionTitle}>Your memories are safe</Text>
          <Text selectable style={bodyStyle}>We ask before any remote processing and preserve the original.</Text>
        </View>
        <SecondaryButton compact label="Learn More" onPress={() => navigate("privacy")} />
      </Panel>
    </ScreenScroll>
  );
}

function WorkflowScreen({ tool, project, stage, startProcessing, setActiveStage, navigate }: { tool: ToolType; project: Project; stage: EditStage; startProcessing: (settings: EditStage["settings"]) => void; setActiveStage: (id: string) => void; navigate: (screen: Screen) => void }) {
  const [intensity, setIntensity] = useState(2);
  const [enabled, setEnabled] = useState({ scratch: true, fade: true, blur: true, detail: true, subjectLock: true, naturalColor: true });
  const copy = toolCopy[tool];
  const options = getWorkflowOptions(tool);
  return (
    <ScreenScroll>
      <Header title={copy.title} leftLabel="<" onLeft={() => navigate("home")} rightLabel="Tips" onRight={() => Alert.alert("Tips", "Stack edits from any timeline stage. Your original is never overwritten.")} />
      <Text selectable style={{ color: colors.amber, textAlign: "center" }}>{tool === "restore" ? "AI is analyzing your photo..." : "Ready from current timeline stage"}</Text>
      <HeroImage asset={stage.outputAsset} uri={stage.outputUri} label={stage.title} tall />
      <Timeline stages={project.stages} activeId={project.activeStageId} onSelect={setActiveStage} />
      <Text selectable style={sectionTitle}>{tool === "restore" ? "AI Restoration Controls" : `${copy.title} Controls`}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {options.map((item) => (
          <Pressable key={item.key} onPress={() => setEnabled((value) => ({ ...value, [item.key]: !value[item.key as keyof typeof value] }))} style={({ pressed }) => [styles.controlCard, pressed && styles.pressed]}>
            <View style={[styles.controlIcon, { borderColor: copy.accent }]}>
              <IconPrimitive name={item.icon} color={copy.accent} size={28} />
            </View>
            <Text selectable style={styles.cardTitle}>{item.title}</Text>
            <Text selectable style={styles.cardBody}>{item.body}</Text>
            <View style={[styles.toggle, enabled[item.key as keyof typeof enabled] && { backgroundColor: colors.amber }]}>
              <View style={[styles.toggleKnob, enabled[item.key as keyof typeof enabled] && { transform: [{ translateX: 25 }], backgroundColor: colors.black }]} />
            </View>
          </Pressable>
        ))}
      </View>
      <Text selectable style={sectionTitle}>{tool === "upscale" ? "Target Resolution" : tool === "extend" ? "Frame Strength" : tool === "recolor" ? "Color Restraint" : "Repair Intensity"}</Text>
      <View style={styles.segmentRow}>
        {["Subtle", "Balanced", "Strong"].map((label, index) => (
          <Pressable key={label} onPress={() => setIntensity(index + 1)} style={({ pressed }) => [styles.segment, intensity === index + 1 && styles.segmentActive, pressed && styles.pressed]}>
            <Text selectable style={{ color: intensity === index + 1 ? colors.black : colors.text }}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <PrimaryButton label={`${copy.title} Photo`} onPress={() => startProcessing({ ...enabled, intensity, branchFrom: project.activeStageId })} />
      <Text selectable style={{ color: colors.muted, textAlign: "center" }}>Original preserved - new output added to timeline</Text>
    </ScreenScroll>
  );
}

function ProcessingScreen({ progress, tool, project, navigate }: { progress: number; tool: ToolType; project: Project; navigate: (screen: Screen) => void }) {
  const stage = getActiveStage(project);
  return (
    <ScreenScroll>
      <Header title="Processing" leftLabel="<" onLeft={() => navigate("workflow")} />
      <HeroImage asset={stage.outputAsset} uri={stage.outputUri} label={toolCopy[tool].title} tall />
      <Panel>
        <Text selectable style={sectionTitle}>{progress < 100 ? "Building the next stage" : "Ready to compare"}</Text>
        <ProgressBar value={progress} />
        {["Upload consent", "Analyze frame", "Render output", "Delete remote copy"].map((item, index) => (
          <View key={item} style={styles.metaRow}>
            <Text selectable style={{ color: progress / 25 >= index ? colors.amber : colors.dim }}>{item}</Text>
            <Text selectable style={{ color: colors.muted }}>{progress / 25 >= index ? "Done" : "Waiting"}</Text>
          </View>
        ))}
      </Panel>
      <SecondaryButton label="Cancel and keep draft" onPress={() => navigate("workflow")} />
    </ScreenScroll>
  );
}

function ComparisonScreen({ project, stage, setActiveStage, exportCurrent, selectTool, navigate }: { project: Project; stage: EditStage; setActiveStage: (id: string) => void; exportCurrent: () => void; selectTool: (tool: ToolType) => void; navigate: (screen: Screen) => void }) {
  return (
    <ScreenScroll>
      <Header title="Comparison" leftLabel="<" onLeft={() => navigate("home")} rightLabel="Export" onRight={exportCurrent} />
      <BeforeAfter asset={stage.outputAsset} uri={stage.outputUri} />
      <Timeline stages={project.stages} activeId={project.activeStageId} onSelect={setActiveStage} />
      <Panel>
        <Metadata label="Restored on" value={formatDisplayDate(stage.createdAt)} />
        <Metadata label="Model" value="RestoreAI mock v2" />
        <Metadata label="Enhancements" value={stage.subtitle} />
        <Metadata label="Remote copy" value={stage.remoteState === "deleted" ? "Deleted after processing" : stage.remoteState} />
      </Panel>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <SecondaryButton compact label="Save" onPress={exportCurrent} />
        <SecondaryButton compact label="Share" onPress={() => Share.share({ message: "RestoreAI result ready for review." })} />
        <SecondaryButton compact label="Edit" onPress={() => selectTool("upscale")} />
        <SecondaryButton compact label="Details" onPress={() => navigate("detail")} />
      </View>
    </ScreenScroll>
  );
}

function ExportScreen({ account, project, stage, prefs, selectExportFormat, message, busy, exportCurrent, navigate }: { account: Account; project: Project; stage: EditStage; prefs: AppPreferences; selectExportFormat: (format: AppPreferences["exportFormat"]) => void; message: string; busy: boolean; exportCurrent: () => void; navigate: (screen: Screen) => void }) {
  return (
    <ScreenScroll>
      <Header title="Export" leftLabel="<" onLeft={() => navigate("comparison")} />
      <HeroImage asset={stage.outputAsset} uri={stage.outputUri} label="Final variant" />
      <Panel>
        <Text selectable style={sectionTitle}>Export variant</Text>
        <Text selectable style={bodyStyle}>{message || "Create a separate file without touching the source or timeline."}</Text>
        <View style={styles.segmentRow}>
          {(["JPEG", "PNG", "TIFF"] as AppPreferences["exportFormat"][]).map((format) => {
            const allowed = canUseExportFormat(account, format);
            return (
              <Pressable key={format} onPress={() => selectExportFormat(format)} style={({ pressed }) => [styles.segment, prefs.exportFormat === format && styles.segmentActive, !allowed && { opacity: 0.55 }, pressed && styles.pressed]}>
                <Text selectable style={{ color: prefs.exportFormat === format ? colors.black : colors.text }}>{allowed ? format : `${format} Pro`}</Text>
              </Pressable>
            );
          })}
        </View>
        <PrimaryButton label={busy ? "Saving..." : `Save ${prefs.exportFormat}`} onPress={exportCurrent} disabled={busy} />
      </Panel>
      <Panel>
        <Text selectable style={sectionTitle}>Variants</Text>
        {[...project.exports, stage].slice(0, 4).map((item) => (
          <Metadata key={item.id} label={item.title} value={item.subtitle} />
        ))}
      </Panel>
    </ScreenScroll>
  );
}

function LibraryScreen({ projects, setProjects, setSelectedProjectId, navigate }: { projects: Project[]; setProjects: (projects: Project[]) => void; setSelectedProjectId: (id: string) => void; navigate: (screen: Screen) => void }) {
  const [filter, setFilter] = useState<"All" | "Restored" | "Failed">("All");
  const filteredProjects = projects.filter((project) => {
    if (filter === "Restored") return project.stages.length > 1;
    if (filter === "Failed") return project.stages.some((stage) => stage.remoteState === "deletion_unavailable");
    return true;
  });
  if (!projects.length) {
    return <StateScreen title="No projects yet" body="Import a photo or start with a sample archive image." action="Import photo" onAction={() => navigate("import")} />;
  }
  return (
    <ScreenScroll withBottom>
      <Header title="Library" rightLabel="Import" onRight={() => navigate("import")} />
      <View style={styles.segmentRow}>
        {(["All", "Restored", "Failed"] as const).map((label) => <Chip key={label} label={label} active={filter === label} onPress={() => setFilter(label)} />)}
      </View>
      {filteredProjects.length ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {filteredProjects.map((project) => {
          const stage = getActiveStage(project);
          return (
            <Pressable
              key={project.id}
              onPress={() => {
                setSelectedProjectId(project.id);
                navigate("detail");
              }}
              onLongPress={() => setProjects(projects.filter((item) => item.id !== project.id))}
              style={({ pressed }) => [styles.libraryCard, pressed && styles.pressed]}
            >
              <Image source={stageImageSource(stage)} contentFit="cover" style={{ width: "100%", height: 170, borderRadius: radii.md }} />
              <Text selectable style={styles.cardTitle}>{project.title}</Text>
              <Text selectable style={styles.cardBody}>{project.stages.length - 1} edits - {project.exports.length} exports</Text>
            </Pressable>
          );
          })}
        </View>
      ) : (
        <Panel>
          <Text selectable style={sectionTitle}>No {filter.toLowerCase()} projects</Text>
          <Text selectable style={bodyStyle}>Change the filter or import a sample to keep working.</Text>
          <SecondaryButton label="Show all" onPress={() => setFilter("All")} />
        </Panel>
      )}
    </ScreenScroll>
  );
}

function DetailScreen({ project, setActiveStage, selectTool, exportCurrent, navigate }: { project: Project; setActiveStage: (id: string) => void; selectTool: (tool: ToolType) => void; exportCurrent: () => void; navigate: (screen: Screen) => void }) {
  const stage = getActiveStage(project);
  return (
    <ScreenScroll>
      <Header title={project.title} leftLabel="<" onLeft={() => navigate("library")} rightLabel="Export" onRight={exportCurrent} />
      <HeroImage asset={stage.outputAsset} uri={stage.outputUri} label={stage.title} tall />
      <Timeline stages={project.stages} activeId={project.activeStageId} onSelect={setActiveStage} />
      <Panel>
        <Metadata label="Original" value="Preserved" />
        <Metadata label="Selected stage" value={stage.subtitle} />
        <Metadata label="Remote status" value={stage.remoteState} />
        <Metadata label="Exports" value={`${project.exports.length}`} />
      </Panel>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {(Object.keys(toolCopy) as ToolType[]).map((tool) => (
          <SecondaryButton key={tool} compact label={toolCopy[tool].title} onPress={() => selectTool(tool)} />
        ))}
      </View>
    </ScreenScroll>
  );
}

function SettingsScreen({ account, prefs, setPrefs, navigate, resetDemo }: { account: Account; prefs: AppPreferences; setPrefs: (prefs: AppPreferences) => void; navigate: (screen: Screen) => void; resetDemo: () => void }) {
  return (
    <ScreenScroll withBottom>
      <Header title="Settings" rightLabel="Account" onRight={() => navigate("account")} />
      <Panel>
        <SettingRow label="Save originals" value={prefs.saveOriginals} onChange={(value) => setPrefs({ ...prefs, saveOriginals: value })} />
        <SettingRow label="Delete remote after processing" value={prefs.deleteRemoteAfterProcessing} onChange={(value) => setPrefs({ ...prefs, deleteRemoteAfterProcessing: value })} />
        <SettingRow label="Offline mode" value={prefs.offlineMode} onChange={(value) => setPrefs({ ...prefs, offlineMode: value })} />
        <SettingRow label="Upload consent remembered" value={prefs.privacyConsent} onChange={(value) => setPrefs({ ...prefs, privacyConsent: value })} />
      </Panel>
      <Panel>
        <Metadata label="Plan" value={account.plan} />
        <Metadata label="Credits" value={`${account.creditsTotal - account.creditsUsed} left`} />
        <Metadata label="Export default" value={prefs.exportFormat} />
      </Panel>
      <SecondaryButton label="View generated references" onPress={() => Alert.alert("References", "Saved in assets/references for implementation review.")} />
      <SecondaryButton label="Reset local demo" onPress={resetDemo} />
    </ScreenScroll>
  );
}

function AccountScreen({ account, message, setAccount, setMessage, setPrefs, navigate }: { account: Account; message: string; setAccount: (account: Account) => void; setMessage: (message: string) => void; setPrefs: React.Dispatch<React.SetStateAction<AppPreferences>>; navigate: (screen: Screen) => void }) {
  const [busy, setBusy] = useState(false);
  async function run(action: "upgrade" | "cancel" | "restore" | "logout") {
    setBusy(true);
    try {
      if (action === "upgrade") {
        setAccount(await billingClient.upgrade(account));
        setMessage("Archive Pro is active for this local MVP session.");
      }
      if (action === "cancel") {
        const nextAccount = await billingClient.cancel(account);
        setAccount(nextAccount);
        setPrefs((value) => ({ ...value, exportFormat: getAllowedExportFormat(nextAccount, value.exportFormat) }));
        setMessage("Archive Pro was canceled. Pro tools and archive exports are locked.");
      }
      if (action === "restore") {
        setAccount(await billingClient.restorePurchases(account));
        setMessage("Purchases restored for this local MVP session.");
      }
      if (action === "logout") {
        setAccount(await authClient.signOut());
        setMessage("");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Account action failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScreenScroll flush>
      <View style={mockStatusRow}>
        <Text style={mockStatusText}>9:41</Text>
        <Text style={mockStatusText}>LTE  100%</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 18 }}>
        <IconButton label="<" onPress={() => navigate("settings")} />
        <Text selectable style={[sectionTitle, { fontFamily: "Georgia", fontSize: 22 }]}>Subscription</Text>
        <Pressable onPress={() => run("restore")} style={{ padding: 10 }}>
          <Text selectable style={{ color: colors.amber }}>Restore</Text>
        </Pressable>
      </View>
      {message ? (
        <Panel>
          <Text selectable style={sectionTitle}>Plan status</Text>
          <Text selectable style={bodyStyle}>{message}</Text>
        </Panel>
      ) : null}
      <View style={subscriptionHero}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text selectable style={{ color: colors.amber, fontWeight: "700" }}>PREMIUM</Text>
          <IconPrimitive name="account" color={colors.amber} size={32} />
        </View>
        <Text selectable style={[titleStyle, { fontSize: 42 }]}>Pro</Text>
        {["Full access to all tools", "Higher resolution exports", "Priority AI processing", "No watermark"].map((item) => (
          <View key={item} style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <IconPrimitive name="check" color={colors.amber} size={16} />
            <Text selectable style={{ color: colors.text, fontSize: 15 }}>{item}</Text>
          </View>
        ))}
        <Text selectable style={[sectionTitle, { fontFamily: "Georgia", fontSize: 28, marginTop: 10 }]}>$3.99 <Text style={{ color: colors.muted, fontSize: 14 }}>/ month</Text></Text>
        <PrimaryButton label={busy ? "Updating..." : "Upgrade to Pro"} onPress={() => run("upgrade")} disabled={busy} />
      </View>
      <Panel raised>
        <Metadata label="Your Plan" value={account.plan} />
        <Text selectable style={[sectionTitle, { fontFamily: "Georgia", fontSize: 30 }]}>{account.creditsUsed} / <Text style={{ color: colors.muted, fontSize: 16 }}>{account.creditsTotal} used</Text></Text>
        <ProgressBar value={(account.creditsUsed / account.creditsTotal) * 100} />
        <Metadata label="Resets" value={`${account.renewsInDays} days`} />
        <Metadata label="Compare Plans" value=">" />
      </Panel>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <SecondaryButton compact label="Cancel" onPress={() => run("cancel")} />
        <SecondaryButton compact label="Sign out" onPress={() => run("logout")} />
      </View>
    </ScreenScroll>
  );
}

function PrivacyScreen({ prefs, setPrefs, onContinue, navigate }: { prefs: AppPreferences; setPrefs: (prefs: AppPreferences) => void; onContinue: () => void; navigate: (screen: Screen) => void }) {
  return (
    <ScreenScroll>
      <Header title="Privacy" leftLabel="<" onLeft={() => navigate("workflow")} />
      <HeroImage asset="archive" label="Local first" />
      <Panel>
        <Text selectable style={sectionTitle}>Confirm temporary upload</Text>
        <Text selectable style={bodyStyle}>Processing is simulated remotely in this build. The source stays preserved locally, and the mock remote result is deleted after processing when enabled.</Text>
        <SettingRow label="Delete remote copy after processing" value={prefs.deleteRemoteAfterProcessing} onChange={(value) => setPrefs({ ...prefs, deleteRemoteAfterProcessing: value })} />
        <PrimaryButton
          label="Allow this processing run"
          onPress={() => {
            setPrefs({ ...prefs, privacyConsent: true });
            onContinue();
          }}
        />
      </Panel>
    </ScreenScroll>
  );
}

function StateScreen({ title, body, action, onAction }: { title: string; body: string; action: string; onAction: () => void }) {
  return (
    <ScreenScroll>
      <HeroImage asset="archive" label="RestoreAI" />
      <Text selectable style={titleStyle}>{title}</Text>
      <Text selectable style={bodyStyle}>{body}</Text>
      <PrimaryButton label={action} onPress={onAction} />
    </ScreenScroll>
  );
}

function BeforeAfter({ asset, uri }: { asset: keyof typeof sampleImages; uri?: string }) {
  const { width } = useWindowDimensions();
  const [zoom, setZoom] = useState(100);
  const [splitMode, setSplitMode] = useState(true);
  const reveal = useSharedValue(width * 0.5);
  const beforeSource = uri ? { uri } : sampleImages[asset];
  const afterSource = uri ? { uri } : sampleImages.portrait;
  const zoomStyle = { transform: [{ scale: zoom / 100 }] };
  const gesture = Gesture.Pan().onUpdate((event) => {
    reveal.value = Math.max(44, Math.min(width - 44, event.absoluteX));
  });
  const overlayStyle = useAnimatedStyle(() => ({ width: reveal.value }));
  const lineStyle = useAnimatedStyle(() => ({ left: reveal.value - 1 }));
  return (
    <GestureDetector gesture={gesture}>
      <View style={{ height: 520, borderRadius: radii.lg, overflow: "hidden", borderWidth: 1, borderColor: colors.stroke }}>
        <Image source={beforeSource} contentFit="cover" style={[{ position: "absolute", inset: 0 }, zoomStyle]} />
        <Animated.View style={[{ position: "absolute", left: 0, top: 0, bottom: 0, overflow: "hidden", opacity: splitMode ? 0.64 : 0.86 }, overlayStyle]}>
          <Image source={afterSource} contentFit="cover" style={[{ width, height: 520 }, zoomStyle]} />
        </Animated.View>
        <Animated.View style={[{ position: "absolute", top: 0, bottom: 0, width: splitMode ? 2 : 0, backgroundColor: colors.amber }, lineStyle]} />
        <Badge label="Before" style={{ left: 16, top: 16 }} />
        <Badge label="After" style={{ right: 16, top: 16 }} />
        <View style={{ position: "absolute", left: 20, bottom: 20, flexDirection: "row", gap: 8 }}>
          <Chip label={`${zoom}%`} active onPress={() => setZoom((value) => (value >= 150 ? 100 : value + 25))} />
          <Chip label={splitMode ? "Split" : "Blend"} active={splitMode} onPress={() => setSplitMode((value) => !value)} />
        </View>
      </View>
    </GestureDetector>
  );
}

function Timeline({ stages, activeId, onSelect }: { stages: EditStage[]; activeId: string; onSelect: (id: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
      {stages.map((stage, index) => (
        <Pressable key={stage.id} onPress={() => onSelect(stage.id)} style={[styles.timelineItem, stage.id === activeId && { borderColor: colors.amber, backgroundColor: "rgba(239,177,106,0.16)" }]}>
          <Text selectable style={{ color: stage.id === activeId ? colors.amber : colors.text, fontSize: 13 }}>{index === 0 ? "Source" : stage.title}</Text>
          <Text selectable style={{ color: colors.muted, fontSize: 11 }}>{stage.sourceStageId ? "Branch saved" : "Original"}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function BottomTabs({ active, navigate, bottom }: { active: string; navigate: (screen: Screen) => void; bottom: number }) {
  const tabs: { key: Screen; label: string; icon: AppIconName }[] = [
    { key: "home", label: "Home", icon: "home" },
    { key: "import", label: "Import", icon: "import" },
    { key: "library", label: "Library", icon: "library" },
    { key: "settings", label: "Settings", icon: "settings" },
  ];
  return (
    <View style={[styles.tabs, { paddingBottom: Math.max(bottom, 14) }]}>
      {tabs.map((tab) => (
        <Pressable
          key={tab.key}
          onPress={() => navigate(tab.key)}
          style={({ pressed }) => [styles.tabItem, active === tab.key && styles.tabItemActive, pressed && styles.pressed]}
        >
          <IconPrimitive name={tab.icon} color={active === tab.key ? colors.amber : colors.muted} size={24} />
          <Text selectable style={{ color: active === tab.key ? colors.amber : colors.muted, fontSize: 12 }}>{tab.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function ScreenScroll({ children, withBottom = false, flush = false }: { children: React.ReactNode; withBottom?: boolean; flush?: boolean }) {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: flush ? 22 : 22, paddingTop: flush ? 16 : 22, paddingBottom: withBottom ? 128 : 34, gap: flush ? 18 : 22 }}
    >
      {children}
    </ScrollView>
  );
}

function Header({ title, leftLabel, rightLabel, onLeft, onRight }: { title: string; leftLabel?: string; rightLabel?: string; onLeft?: () => void; onRight?: () => void }) {
  return (
    <View style={{ minHeight: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <IconButton label={leftLabel ?? ""} onPress={onLeft} />
      <Text selectable numberOfLines={1} adjustsFontSizeToFit style={{ color: colors.text, fontSize: 32, flex: 1, textAlign: "center" }}>{title}</Text>
      <IconButton label={rightLabel ?? ""} onPress={onRight} />
    </View>
  );
}

function IconButton({ label, onPress }: { label: string; onPress?: () => void }) {
  if (!label || !onPress) return <View style={styles.iconSpacer} />;
  const icon = getHeaderIcon(label);
  return (
    <Pressable accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
      {icon ? <IconPrimitive name={icon} color={colors.amber} size={24} /> : <Text selectable style={styles.iconButtonText}>{label}</Text>}
    </Pressable>
  );
}

function getHeaderIcon(label: string): AppIconName | undefined {
  const value = label.toLowerCase();
  if (value === "<" || value === "back") return "back";
  if (value === "x" || value === "close") return "close";
  if (value === "crown" || value === "account") return "account";
  if (value === "tips") return "tips";
  if (value === "export") return "export";
  if (value === "import") return "import";
  return undefined;
}

function HeroImage({ asset, uri, label, tall = false }: { asset: keyof typeof sampleImages; uri?: string; label: string; tall?: boolean }) {
  return (
    <Animated.View entering={FadeIn.duration(350)} layout={LinearTransition} style={[styles.imageWrap, { height: tall ? 510 : 310 }]}>
      <Image source={uri ? { uri } : sampleImages[asset]} contentFit="cover" style={{ position: "absolute", inset: 0 }} />
      <View style={{ position: "absolute", left: 16, bottom: 16 }}>
        <Chip label={label} active />
      </View>
    </Animated.View>
  );
}

function ToolCard({ tool, onPress }: { tool: ToolType; onPress: () => void }) {
  const copy = toolCopy[tool];
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.toolCard, pressed && styles.pressed]}>
      <View style={[styles.iconWell, { borderColor: copy.accent, backgroundColor: `${copy.accent}22` }]}>
        <IconPrimitive name={copy.icon} color={copy.accent} size={32} />
      </View>
      <Text selectable style={[styles.cardTitle, { fontSize: 19 }]}>{copy.title}</Text>
      <Text selectable style={styles.cardBody}>{copy.body}</Text>
    </Pressable>
  );
}

function ImportChoice({ icon, title, subtitle, onPress }: { icon: AppIconName; title: string; subtitle: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.importChoice, pressed && styles.pressed]}>
      <IconPrimitive name={icon} color={colors.amber} size={30} />
      <Text selectable style={[styles.cardTitle, { fontSize: 17 }]}>{title}</Text>
      <Text selectable style={styles.cardBody}>{subtitle}</Text>
    </Pressable>
  );
}

function SectionHeader({ label, action, onPress }: { label: string; action?: string; onPress?: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <Text selectable style={{ color: colors.muted, textTransform: "uppercase", letterSpacing: 0, fontSize: 12, fontWeight: "700" }}>{label}</Text>
      {action && onPress ? <Pressable onPress={onPress} style={({ pressed }) => [styles.textAction, pressed && styles.pressed]}><Text selectable style={{ color: colors.amber, fontWeight: "700" }}>{action}</Text></Pressable> : null}
    </View>
  );
}

function PrimaryButton({ label, onPress, disabled, compact }: { label: string; onPress: () => void; disabled?: boolean; compact?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.primary, compact && { paddingVertical: 12, minHeight: 46 }, disabled && { opacity: 0.6 }, pressed && !disabled && styles.pressed]}>
      <Text selectable style={{ color: colors.black, fontSize: compact ? 15 : 18, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress, compact }: { label: string; onPress: () => void; compact?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.secondary, compact && { flex: 1, minHeight: 54, paddingHorizontal: 8 }, pressed && styles.pressed]}>
      <Text selectable style={{ color: colors.text, textAlign: "center" }}>{label}</Text>
    </Pressable>
  );
}

function Panel({ children, row = false, raised = false }: { children: React.ReactNode; row?: boolean; raised?: boolean }) {
  return <View style={[styles.panel, raised && styles.panelRaised, row && { flexDirection: "row", alignItems: "center" }]}>{children}</View>;
}

function Chip({ label, active = false, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  const content = <Text selectable style={{ color: active ? colors.amber : colors.muted, fontSize: 13, fontWeight: active ? "700" : "500" }}>{label}</Text>;
  const chipStyle = [styles.chip, active && { backgroundColor: "rgba(239,177,106,0.18)", borderColor: colors.amber }];
  if (!onPress) return <View style={chipStyle}>{content}</View>;
  return (
    <Pressable accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [chipStyle, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

function Badge({ label, style }: { label: string; style?: object }) {
  return (
    <View style={[styles.badge, style]}>
      <Text selectable style={{ color: colors.text, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

function UsageStrip({ account }: { account: Account }) {
  const remaining = getRemainingCredits(account);
  return (
    <Panel>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text selectable style={sectionTitle}>Your usage</Text>
        <Text selectable style={{ color: colors.muted }}>This month</Text>
      </View>
      <Text selectable style={{ color: colors.text, fontSize: 32 }}>{account.creditsUsed} / {account.creditsTotal} <Text style={{ fontSize: 14, color: colors.muted }}>credits used</Text></Text>
      <ProgressBar value={(account.creditsUsed / account.creditsTotal) * 100} />
      <Text selectable style={{ color: colors.muted }}>{remaining} credits left - resets in {account.renewsInDays} days</Text>
    </Panel>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <View style={{ height: 8, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 99, overflow: "hidden" }}>
      <Animated.View style={{ width: `${Math.min(100, Math.max(0, value))}%`, height: "100%", backgroundColor: colors.teal }} />
    </View>
  );
}

function Metadata({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <Text selectable style={{ color: colors.muted, flex: 1 }}>{label}</Text>
      <Text selectable style={{ color: colors.text, flex: 1.4, textAlign: "right" }}>{value}</Text>
    </View>
  );
}

function SettingRow({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <View style={styles.metaRow}>
      <Text selectable style={{ color: colors.text, flex: 1 }}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.amber, false: colors.dim }} />
    </View>
  );
}

function getWorkflowOptions(tool: ToolType): WorkflowOption[] {
  if (tool === "upscale") {
    return [
      { key: "detail", icon: "upscale", title: "2x", body: "Balanced archive master" },
      { key: "scratch", icon: "restore", title: "3x", body: "High detail print" },
      { key: "fade", icon: "extend", title: "4x", body: "Safe max preview" },
      { key: "blur", icon: "files", title: "300 DPI", body: "Print ready metadata" },
    ];
  }
  if (tool === "extend") {
    return [
      { key: "subjectLock", icon: "extend", title: "Square", body: "Center preserved" },
      { key: "scratch", icon: "photos", title: "Portrait", body: "Gentle expansion" },
      { key: "fade", icon: "library", title: "Wide", body: "Scene extension" },
      { key: "blur", icon: "lock", title: "Subject Lock", body: "No face distortion" },
    ];
  }
  if (tool === "recolor") {
    return [
      { key: "naturalColor", icon: "recolor", title: "Natural", body: "Restrained tones" },
      { key: "scratch", icon: "restore", title: "Sepia lift", body: "Warm archive color" },
      { key: "fade", icon: "samples", title: "Film", body: "Soft color grade" },
      { key: "blur", icon: "shield", title: "B&W guard", body: "Preserve contrast" },
    ];
  }
  return [
    { key: "scratch", icon: "restore", title: "Scratch Repair", body: "Remove cracks and scratches" },
    { key: "fade", icon: "recolor", title: "Fade Recovery", body: "Restore colors and contrast" },
    { key: "blur", icon: "upscale", title: "Blur Cleanup", body: "Sharpen faces and edges" },
    { key: "detail", icon: "samples", title: "Detail Recovery", body: "Enhance fine details" },
  ];
}

const titleStyle = { color: colors.text, fontSize: 34, lineHeight: 40 } as const;
const sectionTitle = { color: colors.text, fontSize: 20 } as const;
const bodyStyle = { color: colors.muted, fontSize: 16, lineHeight: 23 } as const;
const brandTitle = { color: colors.text, fontFamily: "Georgia", fontSize: 48, lineHeight: 56 } as const;
const logoMark = { color: colors.amber, fontSize: 52, lineHeight: 58 } as const;
const mockStatusRow = {
  minHeight: 34,
  flexDirection: "row" as const,
  alignItems: "center" as const,
  justifyContent: "space-between" as const,
  paddingHorizontal: 18,
};
const mockStatusText = { color: colors.text, fontSize: 16, fontWeight: "700" as const };
const photoStack = {
  position: "absolute" as const,
  width: 220,
  height: 245,
  borderRadius: 14,
  borderWidth: 2,
  borderColor: "rgba(245,238,230,0.68)",
  backgroundColor: colors.panel,
};
const dot = { width: 8, height: 8, borderRadius: 99, backgroundColor: "rgba(245,238,230,0.32)" };
const dotActive = { ...dot, width: 12, backgroundColor: colors.amber };
const subscriptionHero = {
  padding: 22,
  gap: 12,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: "rgba(95,191,192,0.78)",
  backgroundColor: "rgba(9,42,39,0.72)",
};
const inputStyle = {
  minHeight: 54,
  borderWidth: 1,
  borderColor: colors.stroke,
  borderRadius: radii.md,
  color: colors.text,
  paddingHorizontal: 16,
  fontSize: 16,
  backgroundColor: "rgba(255,255,255,0.04)",
} as const;

const styles = {
  heroCard: {
    height: 500,
    borderRadius: radii.lg,
    overflow: "hidden" as const,
    borderWidth: 1,
    borderColor: colors.stroke,
    backgroundColor: colors.panel,
  },
  heroImage: { position: "absolute" as const, inset: 0 },
  beforeAfterLine: {
    position: "absolute" as const,
    top: 0,
    bottom: 0,
    left: "50%" as const,
    width: 1,
    backgroundColor: colors.text,
    opacity: 0.8,
  },
  toolCard: {
    width: "48%" as const,
    minHeight: 168,
    padding: 16,
    gap: 11,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.stroke,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  importChoice: {
    width: "48%" as const,
    minHeight: 130,
    padding: 16,
    justifyContent: "space-between" as const,
    gap: 8,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.stroke,
    backgroundColor: colors.panel,
  },
  iconGlyph: {
    position: "relative" as const,
    overflow: "visible" as const,
  },
  iconFrame: {
    position: "absolute" as const,
    borderRadius: 6,
  },
  iconCircle: {
    position: "absolute" as const,
    borderRadius: 99,
  },
  iconWell: {
    width: 52,
    height: 52,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  controlIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: "700" as const },
  cardBody: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  panel: {
    padding: 18,
    gap: 14,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.stroke,
    backgroundColor: "rgba(255,255,255,0.055)",
  },
  panelRaised: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: "rgba(255,255,255,0.14)",
  },
  imageWrap: {
    borderRadius: radii.lg,
    overflow: "hidden" as const,
    borderWidth: 1,
    borderColor: colors.stroke,
    backgroundColor: colors.panel,
  },
  iconButton: {
    width: 56,
    height: 52,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.softStroke,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  iconSpacer: {
    width: 56,
    height: 52,
  },
  iconButtonText: {
    color: colors.amber,
    fontSize: 13,
    fontWeight: "800" as const,
  },
  primary: {
    minHeight: 62,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: radii.md,
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: colors.amber,
  },
  secondary: {
    minHeight: 58,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: radii.md,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.stroke,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: colors.stroke,
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  badge: {
    position: "absolute" as const,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  dropZone: {
    height: 330,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderStyle: "dashed" as const,
    borderColor: "rgba(239,177,106,0.28)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.045)",
  },
  shield: {
    width: 70,
    height: 70,
    borderRadius: 99,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "rgba(95,191,192,0.16)",
  },
  controlCard: {
    width: "48%" as const,
    minHeight: 166,
    padding: 16,
    alignItems: "center" as const,
    gap: 9,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.stroke,
    backgroundColor: colors.panel,
  },
  toggle: {
    width: 54,
    height: 28,
    borderRadius: 99,
    padding: 3,
    backgroundColor: colors.dim,
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 99,
    backgroundColor: colors.text,
  },
  segmentRow: {
    flexDirection: "row" as const,
    gap: 8,
    alignItems: "center" as const,
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center" as const,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: colors.stroke,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  segmentActive: {
    backgroundColor: colors.amber,
    borderColor: colors.amber,
  },
  timelineItem: {
    minWidth: 112,
    padding: 12,
    gap: 4,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.stroke,
    backgroundColor: colors.panel,
  },
  metaRow: {
    minHeight: 44,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.softStroke,
  },
  libraryCard: {
    width: "48%" as const,
    padding: 10,
    gap: 8,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.stroke,
    backgroundColor: colors.panel,
  },
  tabs: {
    position: "absolute" as const,
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 14,
    paddingHorizontal: 10,
    flexDirection: "row" as const,
    borderTopWidth: 1,
    borderTopColor: colors.softStroke,
    backgroundColor: "rgba(7,11,12,0.96)",
  },
  tabItem: {
    flex: 1,
    minHeight: 58,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 5,
    borderRadius: 18,
  },
  tabItemActive: {
    backgroundColor: "rgba(239,177,106,0.10)",
  },
  textAction: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
};
