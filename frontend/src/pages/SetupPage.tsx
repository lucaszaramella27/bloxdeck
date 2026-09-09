import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  FolderDown,
  Gamepad2,
  Loader2,
  Palette,
  Play,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useHealth, useProfile } from "@/hooks/api-hooks";
import { cn } from "@/lib/cn";
import { installBloxDeck, type InstallResult } from "@/lib/installer";
import { setLaunchConfirmationEnabled } from "@/lib/preferences";
import { completeSetup, dismissForcedSetup } from "@/lib/setup";
import { getStartupContext } from "@/lib/startup";

type SetupOption = {
  id: string;
  label: string;
  description?: string;
  value: boolean;
  onToggle: () => void;
};

type WizardStep = {
  id: string;
  label: string;
  description: string;
};

const installerSteps: WizardStep[] = [
  { id: "destination", label: "Destino", description: "Pasta do app" },
  { id: "shortcuts", label: "Atalhos", description: "Desktop e iniciar" },
  { id: "preferences", label: "Preferências", description: "Launcher" },
  { id: "review", label: "Revisão", description: "Confirmar" },
  { id: "done", label: "Pronto", description: "Instalado" },
];

const setupSteps: WizardStep[] = [
  { id: "backend", label: "Serviço", description: "Conexão" },
  { id: "roblox", label: "Roblox", description: "Conta" },
  { id: "preferences", label: "Preferências", description: "Launcher" },
  { id: "done", label: "Finalizar", description: "Entrar" },
];

const softSpring = { type: "spring", stiffness: 360, damping: 34, mass: 0.85 } as const;
const fastSpring = { type: "spring", stiffness: 520, damping: 36, mass: 0.7 } as const;
const quickFade = { duration: 0.16, ease: "easeOut" } as const;

const stepPanelVariants: Variants = {
  initial: (direction: number) => ({
    opacity: 0,
    x: direction >= 0 ? 28 : -28,
    scale: 0.985,
    filter: "blur(5px)",
  }),
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: softSpring,
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction >= 0 ? -18 : 18,
    scale: 0.99,
    filter: "blur(4px)",
    transition: quickFade,
  }),
};

const subtleItemVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: softSpring },
};

function setupReturnPath(state: unknown) {
  if (!state || typeof state !== "object" || !("from" in state)) {
    return "/";
  }

  const from = (state as { from?: unknown }).from;

  return typeof from === "string" && from.startsWith("/") && from !== "/setup" ? from : "/";
}

function OptionToggle({ option }: { option: SetupOption }) {
  return (
    <motion.button
      type="button"
      layout
      variants={subtleItemVariants}
      whileTap={{ scale: 0.985 }}
      transition={fastSpring}
      onClick={option.onToggle}
      className={cn(
        "flex min-h-16 items-center justify-between gap-4 rounded-lg border px-4 text-left transition",
        option.value
          ? "border-cyan-300/35 bg-cyan-300/[0.12] text-white"
          : "border-white/[0.13] bg-white/[0.075] text-slate-300",
      )}
    >
      <span>
        <span className="block text-sm font-semibold">{option.label}</span>
        {option.description ? (
          <span className="mt-1 block text-xs leading-5 text-slate-500">{option.description}</span>
        ) : null}
      </span>
      <span
        className={cn(
          "flex h-6 w-10 shrink-0 items-center rounded-full border p-0.5 transition",
          option.value ? "border-cyan-200/40 bg-cyan-300/35" : "border-white/15 bg-white/10",
        )}
      >
        <motion.span
          className="h-4 w-4 rounded-full bg-white"
          animate={{ x: option.value ? 16 : 0 }}
          transition={fastSpring}
        />
      </span>
    </motion.button>
  );
}

function WizardTabs({
  steps,
  currentStep,
  completedUntil,
  canOpenDone,
  onSelect,
}: {
  steps: WizardStep[];
  currentStep: number;
  completedUntil: number;
  canOpenDone?: boolean;
  onSelect: (index: number) => void;
}) {
  const progress = steps.length > 1 ? (currentStep / (steps.length - 1)) * 100 : 100;

  return (
    <div className="space-y-3">
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isDone =
            index < completedUntil || (step.id === "done" && Boolean(canOpenDone) && completedUntil >= index);
          const isDisabled = step.id === "done" && !canOpenDone;

          return (
            <motion.button
              key={step.id}
              type="button"
              layout
              disabled={isDisabled}
              whileTap={isDisabled ? undefined : { scale: 0.985 }}
              transition={fastSpring}
              onClick={() => onSelect(index)}
              className={cn(
                "relative min-h-[72px] overflow-hidden rounded-lg border px-3 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-45",
                isActive
                  ? "border-cyan-300/45 text-white"
                  : "border-white/[0.10] bg-white/[0.06] text-slate-300",
              )}
            >
              {isActive ? (
                <motion.span
                  layoutId="setup-active-tab"
                  className="absolute inset-0 rounded-lg bg-cyan-300/[0.14]"
                  transition={softSpring}
                />
              ) : null}
              <span className="relative z-10 flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs font-bold",
                    isDone ? "border-lime-300/30 bg-lime-300/20 text-lime-100" : "border-white/15 bg-white/10",
                  )}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {isDone ? (
                      <motion.span
                        key="done"
                        initial={{ opacity: 0, scale: 0.65, rotate: -18 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0.65 }}
                        transition={fastSpring}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </motion.span>
                    ) : (
                      <motion.span
                        key="number"
                        initial={{ opacity: 0, y: 3 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -3 }}
                        transition={quickFade}
                      >
                        {index + 1}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
                <span className="truncate text-sm font-bold">{step.label}</span>
              </span>
              <span className="relative z-10 mt-2 block truncate text-xs text-slate-500">{step.description}</span>
            </motion.button>
          );
        })}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
        <motion.div
          className="h-full rounded-full bg-cyan-300"
          animate={{ width: `${progress}%` }}
          transition={softSpring}
        />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <motion.div
      layout
      variants={subtleItemVariants}
      className="flex items-center justify-between gap-4 rounded-lg border border-white/[0.10] bg-white/[0.055] px-4 py-3"
    >
      <span className="text-sm font-medium text-slate-400">{label}</span>
      <span className="min-w-0 truncate text-right text-sm font-semibold text-white">{value}</span>
    </motion.div>
  );
}

export function SetupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const health = useHealth();
  const profile = useProfile();
  const [currentStep, setCurrentStep] = useState(0);
  const [stepDirection, setStepDirection] = useState(1);
  const [confirmLaunch, setConfirmLaunch] = useState(true);
  const [robloxFirst, setRobloxFirst] = useState(true);
  const [isInstallerMode, setIsInstallerMode] = useState(false);
  const [installDir, setInstallDir] = useState("");
  const [createDesktopShortcut, setCreateDesktopShortcut] = useState(true);
  const [createStartMenuShortcut, setCreateStartMenuShortcut] = useState(true);
  const [launchAfterInstall, setLaunchAfterInstall] = useState(false);
  const [installResult, setInstallResult] = useState<InstallResult | null>(null);
  const [installError, setInstallError] = useState<string | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const apiOnline = Boolean(health.data?.ok);
  const robloxConnected = Boolean(profile.data?.robloxUserId);
  const returnPath = setupReturnPath(location.state);
  const steps = isInstallerMode ? installerSteps : setupSteps;
  const lastStepIndex = steps.length - 1;

  useEffect(() => {
    let isMounted = true;

    void getStartupContext().then((context) => {
      if (!isMounted) {
        return;
      }

      setIsInstallerMode(context.forceSetup);
      setInstallDir(context.installDir);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setStepDirection(1);
    setCurrentStep(0);
  }, [isInstallerMode]);

  const shortcutOptions = useMemo<SetupOption[]>(
    () => [
      {
        id: "desktopShortcut",
        label: "Criar atalho na área de trabalho",
        description: "Abre o BloxDeck direto pelo desktop.",
        value: createDesktopShortcut,
        onToggle: () => setCreateDesktopShortcut((value) => !value),
      },
      {
        id: "startMenuShortcut",
        label: "Criar atalho no Menu Iniciar",
        description: "Deixa o BloxDeck pesquisavel pelo Windows.",
        value: createStartMenuShortcut,
        onToggle: () => setCreateStartMenuShortcut((value) => !value),
      },
    ],
    [createDesktopShortcut, createStartMenuShortcut],
  );

  const preferenceOptions = useMemo<SetupOption[]>(
    () => [
      {
        id: "confirmLaunch",
        label: "Confirmar antes de entrar em jogos",
        description: "Mostra uma janela antes de abrir o Roblox.",
        value: confirmLaunch,
        onToggle: () => setConfirmLaunch((value) => !value),
      },
      {
        id: "robloxFirst",
        label: "Abrir direto em Jogos",
        description: "Mostra a busca e descoberta de jogos ao iniciar.",
        value: robloxFirst,
        onToggle: () => setRobloxFirst((value) => !value),
      },
      ...(isInstallerMode
        ? [
            {
              id: "launchAfterInstall",
              label: "Abrir BloxDeck depois de instalar",
              description: "Inicia o app instalado quando terminar.",
              value: launchAfterInstall,
              onToggle: () => setLaunchAfterInstall((value) => !value),
            },
          ]
        : []),
    ],
    [confirmLaunch, isInstallerMode, launchAfterInstall, robloxFirst],
  );

  function finish(path = returnPath) {
    setLaunchConfirmationEnabled(confirmLaunch);
    completeSetup();
    dismissForcedSetup();
    void navigate(path, { replace: true });
  }

  async function handleInstall() {
    setInstallError(null);
    setIsInstalling(true);
    setLaunchConfirmationEnabled(confirmLaunch);
    completeSetup();
    dismissForcedSetup();

    try {
      const result = await installBloxDeck({
        createDesktopShortcut,
        createStartMenuShortcut,
        launchAfterInstall,
      });
      setInstallResult(result);
      setInstallDir(result.installDir);
      setStepDirection(1);
      setCurrentStep(lastStepIndex);
    } catch (error) {
      setInstallError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsInstalling(false);
    }
  }

  function nextStep() {
    if (currentStep < lastStepIndex) {
      goToStep(Math.min(currentStep + 1, lastStepIndex));
    }
  }

  function previousStep() {
    if (currentStep > 0) {
      goToStep(Math.max(currentStep - 1, 0));
      return;
    }

    finish("/");
  }

  function goToStep(index: number) {
    const nextIndex = Math.max(0, Math.min(index, lastStepIndex));
    setStepDirection(nextIndex >= currentStep ? 1 : -1);
    setCurrentStep(nextIndex);
  }

  const completedUntil = installResult ? lastStepIndex : currentStep;
  const leftTitle = isInstallerMode
    ? "Instala o BloxDeck por etapas."
    : "Deixa o launcher pronto por etapas.";
  const leftDescription = isInstallerMode
    ? "Escolhe destino, atalhos e preferências antes de instalar."
    : "Confere serviço, conta Roblox e preferências antes de entrar.";

  function renderInstallerStep() {
    const stepId = installerSteps[currentStep]?.id;

    if (stepId === "destination") {
      return (
        <StepPanel
          badge="Etapa 1"
          icon={<FolderDown className="h-4 w-4 text-cyan-200" />}
          title="Escolhe onde instalar"
          description="O BloxDeck será instalado na pasta do usuário atual, sem exigir administrador."
        >
          <div className="rounded-lg border border-white/[0.10] bg-black/15 px-4 py-3 text-sm font-semibold text-slate-200">
            {installDir || "Carregando pasta..."}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InfoRow label="Modo" value="Usuário atual" />
            <InfoRow label="Permissão" value="Sem administrador" />
          </div>
        </StepPanel>
      );
    }

    if (stepId === "shortcuts") {
      return (
        <StepPanel
          badge="Etapa 2"
          icon={<Gamepad2 className="h-4 w-4 text-lime-200" />}
          title="Atalhos do Windows"
          description="Marca onde você quer que o BloxDeck apareça depois da instalação."
        >
          <div className="grid gap-3">
            {shortcutOptions.map((option) => (
              <OptionToggle key={option.id} option={option} />
            ))}
          </div>
        </StepPanel>
      );
    }

    if (stepId === "preferences") {
      return (
        <StepPanel
          badge="Etapa 3"
          icon={<Palette className="h-4 w-4 text-cyan-200" />}
          title="Preferências iniciais"
          description="Essas opções ficam salvas no BloxDeck depois da instalação."
        >
          <div className="grid gap-3">
            {preferenceOptions.map((option) => (
              <OptionToggle key={option.id} option={option} />
            ))}
          </div>
        </StepPanel>
      );
    }

    if (stepId === "review") {
      return (
        <StepPanel
          badge="Etapa 4"
          icon={<Download className="h-4 w-4 text-cyan-200" />}
          title="Confere antes de instalar"
          description="Revise as opções escolhidas antes de concluir a instalação."
        >
          <div className="grid gap-3">
            <InfoRow label="Pasta" value={installDir || "Padrão do usuário"} />
            <InfoRow label="Área de trabalho" value={createDesktopShortcut ? "Criar atalho" : "Não criar"} />
            <InfoRow label="Menu Iniciar" value={createStartMenuShortcut ? "Criar atalho" : "Não criar"} />
            <InfoRow label="Confirmar jogos" value={confirmLaunch ? "Ligado" : "Desligado"} />
            <InfoRow label="Abrir depois" value={launchAfterInstall ? "Sim" : "Não"} />
          </div>
          {installError ? <p className="text-sm font-semibold text-rose-200">{installError}</p> : null}
        </StepPanel>
      );
    }

    return (
      <StepPanel
        badge="Concluído"
        icon={<CheckCircle2 className="h-4 w-4 text-lime-100" />}
        title="BloxDeck instalado"
        description="Agora o launcher já está no Windows com as opções que você escolheu."
      >
        <div className="grid gap-3">
          <InfoRow label="Executável" value={installResult?.executablePath ?? installDir} />
          <InfoRow label="Área de trabalho" value={installResult?.desktopShortcutPath ? "Atalho criado" : "Sem atalho"} />
          <InfoRow label="Menu Iniciar" value={installResult?.startMenuShortcutPath ? "Atalho criado" : "Sem atalho"} />
        </div>
      </StepPanel>
    );
  }

  function renderSetupStep() {
    const stepId = setupSteps[currentStep]?.id;

    if (stepId === "backend") {
      return (
        <StepPanel
          badge="Etapa 1"
          icon={<Server className="h-4 w-4 text-cyan-200" />}
          title="Verificar serviço"
          description="Confirma que o BloxDeck está pronto para sincronizar dados e salvar suas preferências."
        >
          <div className="flex items-start justify-between gap-4 rounded-lg border border-white/[0.10] bg-white/[0.055] p-4">
            <div>
              <p className="text-sm font-bold text-white">{apiOnline ? "Serviço ativo" : "Serviço indisponível"}</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {apiOnline ? "Conexão com o serviço confirmada." : "Não foi possível conectar ao serviço do BloxDeck."}
              </p>
            </div>
            <Badge tone={apiOnline ? "lime" : "amber"}>{apiOnline ? "Ativo" : "Indisponível"}</Badge>
          </div>
          <Button type="button" variant="secondary" onClick={() => void health.refetch()}>
            <RefreshCw className={cn("h-4 w-4", health.isFetching && "animate-spin")} />
            Verificar serviço
          </Button>
        </StepPanel>
      );
    }

    if (stepId === "roblox") {
      return (
        <StepPanel
          badge="Etapa 2"
          icon={<UserRound className="h-4 w-4 text-lime-200" />}
          title="Conta Roblox"
          description="Conecte sua conta para liberar perfil, social, avatar e jogos no BloxDeck."
        >
          <div className="flex items-start justify-between gap-4 rounded-lg border border-white/[0.10] bg-white/[0.055] p-4">
            <div>
              <p className="text-sm font-bold text-white">{robloxConnected ? "Conta conectada" : "Conta necessária"}</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {robloxConnected
                  ? `${profile.data?.robloxUsername ?? profile.data?.displayName} está conectado.`
                  : "Conecte sua conta Roblox para continuar com o BloxDeck."}
              </p>
            </div>
            <Badge tone={robloxConnected ? "lime" : "amber"}>{robloxConnected ? "Conectado" : "Pendente"}</Badge>
          </div>
          <Button type="button" variant="secondary" onClick={() => finish("/login")}>
            <ShieldCheck className="h-4 w-4" />
            Conectar Roblox
          </Button>
        </StepPanel>
      );
    }

    if (stepId === "preferences") {
      return (
        <StepPanel
          badge="Etapa 3"
          icon={<Palette className="h-4 w-4 text-cyan-200" />}
          title="Preferências do launcher"
          description="Escolhe como o BloxDeck deve se comportar quando abrir."
        >
          <div className="grid gap-3">
            {preferenceOptions.map((option) => (
              <OptionToggle key={option.id} option={option} />
            ))}
          </div>
        </StepPanel>
      );
    }

    return (
      <StepPanel
        badge="Finalizar"
        icon={<Play className="h-4 w-4 text-lime-100" />}
        title="Tudo pronto"
        description="Agora você pode entrar no BloxDeck com as preferências salvas."
      >
        <div className="rounded-lg border border-lime-300/20 bg-lime-300/[0.095] p-5">
          <div className="flex items-start gap-3">
            <Gamepad2 className="mt-0.5 h-5 w-5 shrink-0 text-lime-100" />
            <div>
              <h2 className="text-sm font-bold text-white">BloxDeck pronto</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                O app abre jogos pelo protocolo oficial do Roblox e mantém uma confirmação antes de iniciar.
              </p>
            </div>
          </div>
        </div>
      </StepPanel>
    );
  }

  const primaryLabel = isInstallerMode
    ? currentStep === lastStepIndex
      ? "Concluir"
      : installerSteps[currentStep]?.id === "review"
        ? "Instalar BloxDeck"
        : "Próximo"
    : currentStep === lastStepIndex
      ? "Entrar no BloxDeck"
      : "Próximo";

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="flex h-full min-h-[700px] overflow-hidden bg-[var(--sidebar-bg)] text-slate-100"
    >
      <motion.section
        initial={{ opacity: 0, x: -18 }}
        animate={{ opacity: 1, x: 0 }}
        transition={softSpring}
        className="flex w-[36%] min-w-[390px] flex-col justify-between border-r border-white/[0.13] bg-[var(--panel-bg)] p-8"
      >
        <div>
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ rotate: -8, scale: 0.85 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={softSpring}
              className="flex h-12 w-12 items-center justify-center rounded-lg border border-cyan-100/35 bg-cyan-300 text-slate-950"
            >
              <Sparkles className="h-5 w-5" />
            </motion.div>
            <div>
              <div className="text-xl font-bold tracking-normal text-white">BloxDeck</div>
              <div className="mt-1 text-xs font-medium text-slate-500">
                {isInstallerMode ? "Instalador BloxDeck" : "Configuração inicial"}
              </div>
            </div>
          </div>

          <div className="mt-14">
            <Badge tone="cyan">{isInstallerMode ? "Instalação guiada" : "Primeira execução"}</Badge>
            <h1 className="mt-5 max-w-md text-5xl font-bold leading-tight tracking-normal text-white">{leftTitle}</h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-slate-400">{leftDescription}</p>
          </div>
        </div>

        <div className="space-y-3">
          {steps.map((step, index) => {
            const isActive = index === currentStep;
            const isDone = installResult ? true : index < currentStep;

            return (
              <motion.button
                key={step.id}
                type="button"
                layout
                whileTap={{ scale: 0.985 }}
                transition={fastSpring}
                onClick={() => goToStep(index)}
                disabled={step.id === "done" && !installResult && isInstallerMode}
                className={cn(
                  "relative flex w-full items-center gap-3 overflow-hidden rounded-lg border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-45",
                  isActive
                    ? "border-cyan-300/35"
                    : "border-white/[0.10] bg-white/[0.065]",
                )}
              >
                {isActive ? (
                  <motion.span
                    layoutId="setup-sidebar-active"
                    className="absolute inset-0 rounded-lg bg-cyan-300/[0.12]"
                    transition={softSpring}
                  />
                ) : null}
                <div
                  className={cn(
                    "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    isDone ? "bg-lime-300/18 text-lime-100" : "bg-white/10 text-slate-400",
                  )}
                >
                  {isDone ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                </div>
                <span className="relative z-10 min-w-0">
                  <span className="block truncate text-sm font-semibold text-white">{step.label}</span>
                  <span className="mt-0.5 block truncate text-xs text-slate-500">{step.description}</span>
                </span>
              </motion.button>
            );
          })}
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...softSpring, delay: 0.04 }}
        className="flex min-w-0 flex-1 items-center justify-center p-8"
      >
        <div className="w-full max-w-4xl space-y-5">
          <WizardTabs
            steps={steps}
            currentStep={currentStep}
            completedUntil={completedUntil}
            canOpenDone={Boolean(installResult) || !isInstallerMode}
            onSelect={goToStep}
          />

          <AnimatePresence mode="wait" custom={stepDirection} initial={false}>
            <motion.div
              key={`${isInstallerMode ? "installer" : "setup"}-${currentStep}`}
              custom={stepDirection}
              variants={stepPanelVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {isInstallerMode ? renderInstallerStep() : renderSetupStep()}
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between gap-3">
            <Button type="button" variant="secondary" onClick={previousStep} disabled={isInstalling}>
              {currentStep === 0 ? null : <ArrowLeft className="h-4 w-4" />}
              {currentStep === 0 ? (isInstallerMode ? "Continuar sem instalar" : "Depois") : "Voltar"}
            </Button>
            <Button
              type="button"
              size="lg"
              onClick={() => {
                if (isInstallerMode && installerSteps[currentStep]?.id === "review") {
                  void handleInstall();
                  return;
                }

                if (currentStep === lastStepIndex) {
                  finish(robloxFirst ? "/games" : "/");
                  return;
                }

                nextStep();
              }}
              disabled={isInstalling}
            >
              {isInstalling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isInstallerMode && installerSteps[currentStep]?.id === "review" ? (
                <Download className="h-4 w-4" />
              ) : currentStep === lastStepIndex ? (
                <Play className="h-4 w-4" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              {primaryLabel}
            </Button>
          </div>
        </div>
      </motion.section>
    </motion.main>
  );
}

function StepPanel({
  badge,
  icon,
  title,
  description,
  children,
}: {
  badge: string;
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <motion.article layout className="glass-panel min-h-[430px] rounded-lg p-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...softSpring, delay: 0.04 }}
        className="flex items-start justify-between gap-5"
      >
        <div className="min-w-0">
          <Badge tone="cyan">{badge}</Badge>
          <div className="mt-4 flex items-center gap-2 text-lg font-bold text-white">
            {icon}
            {title}
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">{description}</p>
        </div>
      </motion.div>
      <motion.div
        initial="initial"
        animate="animate"
        variants={{ animate: { transition: { staggerChildren: 0.055, delayChildren: 0.08 } } }}
        className="mt-6 grid gap-4"
      >
        {children}
      </motion.div>
    </motion.article>
  );
}
