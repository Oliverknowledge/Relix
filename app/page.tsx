"use client";

import {
  WalletReadyState,
  type WalletName
} from "@solana/wallet-adapter-base";
import {
  useConnection,
  useWallet,
  type Wallet
} from "@solana/wallet-adapter-react";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction
} from "@solana/web3.js";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore
} from "react";
import {
  createCampaignPlan,
  defaultFounderRequest,
  type Bid,
  type CampaignPlan,
  type FounderRequest,
  type PaymentResult,
  formatSol
} from "@/app/lib/campaign";
import {
  createCampaignAssets,
  type GrowthCampaignAssets
} from "@/app/lib/campaign-assets";
import type {
  GitHubRepositoryContext,
  GitHubRepositorySummary
} from "@/app/lib/github-tool";
import {
  createGrowthEmployeeWork,
  type EmployeeAction,
  type GrowthEmployeeWork
} from "@/app/lib/growth-employee";
import type { CampaignMemoryRecord } from "@/app/lib/memory-store";
import type { RepositoryAnalysis } from "@/app/lib/repository-analysis";
import { analyzeRepository } from "@/app/lib/repository-analysis";
import {
  FAUCET_URL,
  LOW_BALANCE_SOL,
  explorerUrl,
  settlementAmountFor
} from "@/app/lib/wallet";
import type {
  ScheduledXPost,
  XConnectionStatus
} from "@/app/lib/x-types";

const subscribeToClient = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const scrollToElement = (element: HTMLElement | null, behavior: ScrollBehavior) => {
  if (!element) {
    return;
  }

  const top = element.getBoundingClientRect().top + window.scrollY - 48;
  window.scrollTo({ top, behavior });
};

type ReleaseStatus = "idle" | "signing" | "confirming" | "confirmed";

type WorkLogEntry = {
  createdAt: string;
  id: string;
  status: "active" | "done";
  text: string;
};

type GitHubStatus = {
  configured: boolean;
  connected: boolean;
  error?: string;
  user?: {
    avatarUrl: string;
    login: string;
    url: string;
  };
};

const emptyGitHubStatus: GitHubStatus = {
  configured: false,
  connected: false
};

const emptyXStatus: XConnectionStatus = {
  configured: false,
  connected: false
};
const PHANTOM_DOWNLOAD_URL = "https://phantom.com/download";
const REQUIRED_X_WRITE_SCOPES = [
  "tweet.read",
  "users.read",
  "tweet.write",
  "offline.access"
];

export default function Home() {
  const isClient = useSyncExternalStore(
    subscribeToClient,
    getClientSnapshot,
    getServerSnapshot
  );
  const { connection } = useConnection();
  const {
    wallets,
    wallet,
    publicKey,
    connected,
    connecting,
    select,
    connect,
    disconnect,
    sendTransaction
  } = useWallet();
  const initialCampaign = useMemo(
    () =>
      createCampaignPlan({
        ...defaultFounderRequest,
        budgetSol: 10,
        goal: "Get 500 waitlist signups."
      }),
    []
  );
  const [form, setForm] = useState<FounderRequest>({
    ...defaultFounderRequest,
    budgetSol: 10,
    deadline: "2026-07-18",
    goal: "Get 500 waitlist signups."
  });
  const [campaign, setCampaign] = useState<CampaignPlan>(initialCampaign);
  const [githubStatus, setGithubStatus] =
    useState<GitHubStatus>(emptyGitHubStatus);
  const [repositories, setRepositories] = useState<GitHubRepositorySummary[]>([]);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [reposLoading, setReposLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [githubContext, setGithubContext] =
    useState<GitHubRepositoryContext | null>(null);
  const [repositoryAnalysis, setRepositoryAnalysis] =
    useState<RepositoryAnalysis | null>(null);
  const [campaignMemory, setCampaignMemory] = useState<CampaignMemoryRecord[]>(
    []
  );
  const [campaignAssets, setCampaignAssets] =
    useState<GrowthCampaignAssets | null>(null);
  const [growthWork, setGrowthWork] = useState<GrowthEmployeeWork | null>(null);
  const [xStatus, setXStatus] = useState<XConnectionStatus>(emptyXStatus);
  const [workLog, setWorkLog] = useState<WorkLogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [integrationError, setIntegrationError] = useState<string | null>(null);
  const [executedActionCount, setExecutedActionCount] = useState(0);
  const [isExecutingWork, setIsExecutingWork] = useState(false);
  const [payment, setPayment] = useState<PaymentResult | null>(null);
  const [releaseError, setReleaseError] = useState<string | null>(null);
  const [releaseStatus, setReleaseStatus] = useState<ReleaseStatus>("idle");
  const [balanceSol, setBalanceSol] = useState<number | null>(null);
  const [walletMessage, setWalletMessage] = useState<string | null>(null);
  const [pendingWalletName, setPendingWalletName] =
    useState<WalletName | null>(null);
  const [isAirdropping, setIsAirdropping] = useState(false);
  const [copiedAssetId, setCopiedAssetId] = useState<string | null>(null);
  const [scheduleTime, setScheduleTime] = useState(defaultScheduleInput);
  const [xDrafts, setXDrafts] = useState<Record<string, string>>({});
  const [xPosts, setXPosts] = useState<ScheduledXPost[]>([]);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isSavingDrafts, setIsSavingDrafts] = useState(false);
  const [publishingPostId, setPublishingPostId] = useState<string | null>(null);
  const [scheduleMessage, setScheduleMessage] = useState<string | null>(null);
  const flowRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const refreshToolStatuses = useCallback(async () => {
    setStatusLoading(true);

    try {
      const [githubResponse, xResponse] = await Promise.all([
        fetch("/api/github/status", { cache: "no-store" }),
        fetch("/api/x/status", { cache: "no-store" })
      ]);

      setGithubStatus((await githubResponse.json()) as GitHubStatus);
      setXStatus((await xResponse.json()) as XConnectionStatus);
    } catch {
      setIntegrationError("Could not read connection status.");
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!publicKey) {
      setBalanceSol(null);
      return;
    }

    try {
      const lamports = await connection.getBalance(publicKey, "confirmed");
      setBalanceSol(lamports / LAMPORTS_PER_SOL);
    } catch {
      setWalletMessage("Could not read devnet balance.");
    }
  }, [connection, publicKey]);

  const loadXPosts = useCallback(
    async (campaignId: string, publishDue = false) => {
    try {
      const response = await fetch(
          `/api/x/posts?campaignId=${encodeURIComponent(
            campaignId
          )}&publishDue=${publishDue ? "true" : "false"}`,
        { cache: "no-store" }
      );
        const data = (await response.json()) as { posts?: ScheduledXPost[] };

        setXPosts(data.posts || []);
    } catch {
        setScheduleMessage("Could not load X posts.");
    }
    },
    []
  );

  const loadRepositories = useCallback(async () => {
    setReposLoading(true);

    try {
      const response = await fetch("/api/github/repos", { cache: "no-store" });
      const data = (await response.json()) as {
        error?: string;
        repositories?: GitHubRepositorySummary[];
      };

      if (!response.ok || !data.repositories) {
        throw new Error(data.error || "Could not load repositories.");
      }

      const nextRepositories = data.repositories;

      setRepositories(nextRepositories);
      setSelectedRepo(
        (current) => current || nextRepositories[0]?.fullName || ""
      );
    } catch (error) {
      setIntegrationError(
        error instanceof Error ? error.message : "Could not load repositories."
      );
    } finally {
      setReposLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshToolStatuses();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [refreshToolStatuses]);

  useEffect(() => {
    if (githubStatus.connected) {
      const timer = window.setTimeout(() => {
        void loadRepositories();
      }, 0);

      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [githubStatus.connected, loadRepositories]);

  useEffect(() => {
    if (!xStatus.connected || !campaign?.id) {
      return;
    }

    const hasScheduledPosts = xPosts.some((post) => post.status === "scheduled");

    if (!hasScheduledPosts) {
      return;
    }

    const timer = window.setInterval(() => {
      void loadXPosts(campaign.id, true);
    }, 30_000);

    return () => {
      window.clearInterval(timer);
    };
  }, [campaign?.id, loadXPosts, xPosts, xStatus.connected]);

  useEffect(() => {
    if (!publicKey) {
      return;
    }

    let cancelled = false;

    connection
      .getBalance(publicKey, "confirmed")
      .then((lamports) => {
        if (!cancelled) {
          setBalanceSol(lamports / LAMPORTS_PER_SOL);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWalletMessage("Could not read devnet balance.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [connection, publicKey]);

  useEffect(() => {
    if (!pendingWalletName || wallet?.adapter.name !== pendingWalletName) {
      return;
    }

    let cancelled = false;

    connect()
      .then(() => {
        if (!cancelled) {
          setWalletMessage(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setWalletMessage(
            error instanceof Error ? error.message : "Wallet connection failed."
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPendingWalletName(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [connect, pendingWalletName, wallet?.adapter.name]);

  const connectWallet = (walletName: WalletName) => {
    setWalletMessage(null);
    select(walletName);
    setPendingWalletName(walletName);
  };

  const requestDevnetSol = async () => {
    if (!publicKey || isAirdropping) {
      return;
    }

    setWalletMessage(null);
    setIsAirdropping(true);

    try {
      const signature = await connection.requestAirdrop(
        publicKey,
        LAMPORTS_PER_SOL
      );
      const latestBlockhash = await connection.getLatestBlockhash("confirmed");

      await connection.confirmTransaction(
        {
          signature,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
        },
        "confirmed"
      );
      await refreshBalance();
      setWalletMessage("Devnet SOL received.");
    } catch {
      setWalletMessage("Airdrop unavailable. Use the devnet faucet link.");
    } finally {
      setIsAirdropping(false);
    }
  };

  const disconnectX = async () => {
    try {
      await fetch("/api/x/disconnect", { method: "POST" });
      setXStatus({ configured: xStatus.configured, connected: false });
      setXPosts([]);
      setScheduleMessage(null);
    } catch {
      setIntegrationError("Could not disconnect X.");
    }
  };

  const releasePayment = async () => {
    if (!publicKey || !connected) {
      setReleaseError("Connect a devnet wallet to release payment.");
      return;
    }

    const winningBid = campaign.winningBid;
    const settlementSol = settlementAmountFor(winningBid.priceSol);
    const settlementLamports = Math.round(settlementSol * LAMPORTS_PER_SOL);

    setReleaseError(null);
    setReleaseStatus("signing");

    try {
      const latestBlockhash = await connection.getLatestBlockhash("confirmed");
      const transaction = new Transaction({
        feePayer: publicKey,
        recentBlockhash: latestBlockhash.blockhash
      }).add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(winningBid.agentWallet),
          lamports: settlementLamports
        })
      );

      const signature = await sendTransaction(transaction, connection, {
        preflightCommitment: "confirmed"
      });

      setReleaseStatus("confirming");

      await connection.confirmTransaction(
        {
          signature,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
        },
        "confirmed"
      );

      const slot = await connection.getSlot("confirmed");

      const nextPayment: PaymentResult = {
        ok: true,
        mode: "devnet-transfer",
        status: "confirmed",
        campaignId: campaign.id,
        winnerAgent: winningBid.agentName,
        signature,
        explorerUrl: explorerUrl(signature),
        contractAmountSol: winningBid.priceSol,
        settlementSol,
        agentWallet: winningBid.agentWallet,
        founderWallet: publicKey.toBase58(),
        slot
      };

      setPayment(nextPayment);
      setReleaseStatus("confirmed");
      setExecutedActionCount(0);
      setIsExecutingWork(true);
      void refreshBalance();
      void saveCampaignMemory(nextPayment);

      const actions = growthWork?.actions || [];
      for (let index = 0; index < actions.length; index += 1) {
        await sleep(420);
        setExecutedActionCount(index + 1);
      }

      setIsExecutingWork(false);
    } catch (error) {
      setReleaseStatus("idle");
      setReleaseError(
        error instanceof Error ? error.message : "Payment release failed."
      );
    }
  };

  const hireEmployee = async () => {
    if (isRunning) {
      return;
    }

    if (!githubStatus.connected) {
      setIntegrationError(
        githubStatus.configured
          ? "Connect GitHub before hiring the employee."
          : "GitHub OAuth is not configured yet. Add the GitHub client secret to complete OAuth."
      );
      return;
    }

    const missingXScopes = missingXWriteScopes(xStatus);

    if (!xStatus.connected || missingXScopes.length > 0) {
      setIntegrationError(
        xStatus.connected && missingXScopes.length > 0
          ? `Reconnect X after enabling ${missingXScopes.join(
              ", "
            )} in the X Developer Portal.`
          : xStatus.configured
          ? "Connect X before hiring the employee."
          : "X OAuth is not configured yet. Add the X client credentials and token encryption key."
      );
      return;
    }

    setPayment(null);
    setReleaseError(null);
    setReleaseStatus("idle");
    setExecutedActionCount(0);
    setIsExecutingWork(false);
    setWorkLog([]);
    setHasRun(false);
    setIntegrationError(null);
    setGithubContext(null);
    setRepositoryAnalysis(null);
    setCampaignMemory([]);
    setCampaignAssets(null);
    setGrowthWork(null);
    setXDrafts({});
    setXPosts([]);
    setScheduleMessage(null);
    setIsRunning(true);

    window.setTimeout(() => {
      scrollToElement(flowRef.current, "smooth");
    }, 80);

    let logIndex = 0;
    const pendingActivity: WorkLogEntry[] = [];
    let activeCampaignId = "";
    let activeRepository = selectedRepo || "pending";
    const addLog = async (
      text: string,
      status: WorkLogEntry["status"],
      duration = status === "active" ? 720 : 420
    ) => {
      const id = `${logIndex}-${text}`;
      const entry = {
        createdAt: new Date().toISOString(),
        id,
        status,
        text
      };
      logIndex += 1;
      pendingActivity.push(entry);
      setWorkLog((entries) => [...entries, entry]);

      if (activeCampaignId) {
        void saveActivity(activeCampaignId, activeRepository, [entry]);
      }

      await sleep(duration);
    };

    try {
      await addLog("Hiring Growth Employee...", "active", 760);
      await addLog("Employee hired", "done", 460);
      await addLog("Reading repository...", "active", 680);

      const context = await fetchJson<GitHubRepositoryContext>(
        `/api/github/context${selectedRepo ? `?repo=${encodeURIComponent(selectedRepo)}` : ""}`
      );
      activeRepository = context.fullName;
      setGithubContext(context);

      await addLog(
        context.readme ? "README understood" : "Repository description understood",
        "done"
      );
      await addLog("Reading recent commits...", "active", 640);
      await addLog(`${context.commits.length} commits analysed`, "done");

      const nextRequest: FounderRequest = {
        ...form,
        description:
          context.description ||
          context.readme.slice(0, 240) ||
          defaultFounderRequest.description,
        gameName: humanizeName(context.name)
      };
      const nextCampaign = createCampaignPlan(nextRequest);
      const nextAssets = createCampaignAssets({
        github: context,
        goal: nextRequest.goal
      });
      const nextAnalysis = analyzeRepository(context);
      const previousCampaigns = await loadCampaignMemory(context.fullName);
      const nextWork = createGrowthEmployeeWork({
        assets: nextAssets,
        github: context,
        specialistName: specialistDisplayName(nextCampaign.winningBid)
      });

      activeCampaignId = nextCampaign.id;
      setCampaign(nextCampaign);
      setCampaignAssets(nextAssets);
      setRepositoryAnalysis(nextAnalysis);
      setCampaignMemory(previousCampaigns);
      setGrowthWork(nextWork);
      setXDrafts(draftsFromAssets(nextAssets));
      await loadXPosts(nextCampaign.id, true);
      void saveActivity(nextCampaign.id, context.fullName, pendingActivity);

      await addLog("Detecting launch-worthy changes...", "active", 720);
      await addLog(nextAssets.opportunityLabel, "done");
      await addLog("Planning campaign...", "active", 720);
      await addLog("Launch opportunity identified", "done");
      await addLog("Searching marketplace...", "active", 680);
      await addLog("4 specialists found", "done");
      await addLog("Requesting bids...", "active", 760);

      for (let index = 0; index < nextCampaign.bids.length; index += 1) {
        await sleep(360);
        await addLog(
          `${specialistDisplayName(nextCampaign.bids[index])} responded`,
          "done",
          320
        );
      }

      await addLog("Evaluating expected outcomes...", "active", 760);
      await addLog(
        `${specialistDisplayName(nextCampaign.winningBid)} selected`,
        "done"
      );
      await addLog("Preparing payment...", "active", 640);
      await addLog("Ready for founder approval", "done");
      await addLog("Waiting for delivery...", "active", 760);
      await addLog("Delivery received", "done");
      await addLog("Reviewing quality...", "active", 700);
      await addLog("Approved", "done");

      setHasRun(true);
      window.setTimeout(() => {
        scrollToElement(resultsRef.current, "smooth");
      }, 120);
      window.setTimeout(() => {
        scrollToElement(resultsRef.current, "auto");
      }, 900);
    } catch (error) {
      setIntegrationError(
        error instanceof Error
          ? error.message
          : "The employee could not read GitHub."
      );
      setWorkLog((entries) => [
        ...entries,
        {
          id: `error-${entries.length}`,
          createdAt: new Date().toISOString(),
          status: "done",
          text: "GitHub needs attention"
        }
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  const copyAsset = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAssetId(id);

      window.setTimeout(() => {
        setCopiedAssetId(null);
      }, 1400);
    } catch {
      setCopiedAssetId(null);
    }
  };

  const draftPosts = () => {
    if (!campaignAssets) {
      return [];
    }

    return campaignAssets.launchThread.map((post, index) => ({
      label: post.label,
      sourceId: `thread-${index}`,
      text: xDrafts[`thread-${index}`] ?? post.text
    }));
  };

  const saveXPostDrafts = async () => {
    if (!campaignAssets || isSavingDrafts) {
      return;
    }

    const posts = draftPosts();
    const invalidPost = posts.find((post) => !validXPost(post.text));

    if (invalidPost) {
      setScheduleMessage("Each X post must be between 1 and 280 characters.");
      return;
    }

    setIsSavingDrafts(true);
    setScheduleMessage(null);

    try {
      const response = await fetch("/api/x/schedule", {
        body: JSON.stringify({
          campaignId: campaign.id,
          posts: posts.map((post) => ({
            label: post.label,
            sourceId: post.sourceId,
            text: post.text
          })),
          repository: campaignAssets.repository,
          status: "draft"
        }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });
      const data = (await response.json()) as {
        error?: string;
        posts?: ScheduledXPost[];
      };

      if (!response.ok || !data.posts) {
        throw new Error(data.error || "Could not save X drafts.");
      }

      setXPosts(data.posts);
      setScheduleMessage("Drafts saved.");
    } catch (error) {
      setScheduleMessage(
        error instanceof Error ? error.message : "Could not save X drafts."
      );
    } finally {
      setIsSavingDrafts(false);
    }
  };

  const scheduleXLaunchPosts = async () => {
    if (!campaignAssets || isScheduling) {
      return;
    }

    const firstPostAt = new Date(scheduleTime);

    if (Number.isNaN(firstPostAt.getTime())) {
      setScheduleMessage("Choose a valid schedule time.");
      return;
    }

    setIsScheduling(true);
    setScheduleMessage(null);

    try {
      const posts = draftPosts().map((post, index) => {
        const scheduledAt = new Date(firstPostAt.getTime() + index * 15 * 60_000);

        return {
          label: post.label,
          scheduledFor: scheduledAt.toISOString(),
          sourceId: post.sourceId,
          text: post.text
        };
      });

      if (posts.some((post) => !validXPost(post.text))) {
        setScheduleMessage("Each X post must be between 1 and 280 characters.");
        return;
      }

      const response = await fetch("/api/x/schedule", {
        body: JSON.stringify({
          campaignId: campaign.id,
          posts,
          repository: campaignAssets.repository,
          status: "scheduled"
        }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });
      const data = (await response.json()) as {
        error?: string;
        posts?: ScheduledXPost[];
      };

      if (!response.ok || !data.posts) {
        throw new Error(data.error || "Could not schedule X posts.");
      }

      setXPosts(data.posts);
      setScheduleMessage("Launch posts scheduled.");
    } catch (error) {
      setScheduleMessage(
        error instanceof Error ? error.message : "Could not schedule X posts."
      );
    } finally {
      setIsScheduling(false);
    }
  };

  const publishXPostNow = async ({
    label,
    postId,
    sourceId
  }: {
    label?: string;
    postId?: string;
    sourceId?: string;
  }) => {
    if (!campaignAssets || publishingPostId) {
      return;
    }

    const draftText = sourceId
      ? xDrafts[sourceId] ?? draftPosts().find((post) => post.sourceId === sourceId)?.text
      : undefined;
    const text: string =
      postId && !sourceId
        ? ""
        : draftText || "";

    if (!postId && !validXPost(text)) {
      setScheduleMessage("Each X post must be between 1 and 280 characters.");
      return;
    }

    setPublishingPostId(postId || sourceId || "new-post");
    setScheduleMessage(null);

    try {
      const response = await fetch("/api/x/post", {
        body: JSON.stringify({
          approved: true,
          campaignId: campaign.id,
          label,
          postId,
          repository: campaignAssets.repository,
          sourceId,
          text
        }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });
      const data = (await response.json()) as {
        error?: string;
        post?: ScheduledXPost;
      };

      if (!response.ok || !data.post) {
        throw new Error(data.error || "Could not publish X post.");
      }

      setXPosts((posts) => upsertClientXPost(posts, data.post as ScheduledXPost));
      setScheduleMessage("Published to X.");
    } catch (error) {
      setScheduleMessage(
        error instanceof Error ? error.message : "Could not publish X post."
      );
      await loadXPosts(campaign.id);
    } finally {
      setPublishingPostId(null);
    }
  };

  const cancelScheduledXPost = async (postId: string) => {
    const response = await fetch("/api/x/schedule", {
      body: JSON.stringify({ action: "cancel", postId }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });
    const data = (await response.json()) as {
      error?: string;
      post?: ScheduledXPost;
    };

    if (!response.ok || !data.post) {
      throw new Error(data.error || "Could not cancel scheduled post.");
    }

    setXPosts((posts) => upsertClientXPost(posts, data.post as ScheduledXPost));
  };

  const saveActivity = async (
    campaignId: string,
    repository: string,
    entries: WorkLogEntry[]
  ) => {
    if (entries.length === 0) {
      return;
    }

    await fetch("/api/activity/log", {
      body: JSON.stringify({
        records: entries.map((entry) => ({
          campaign_id: campaignId,
          created_at: entry.createdAt,
          id: `${campaignId}-${entry.id}`,
          repository,
          status: entry.status,
          text: entry.text
        }))
      }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });
  };

  const loadCampaignMemory = async (repository: string) => {
    const response = await fetch(
      `/api/memory/list?repository=${encodeURIComponent(repository)}`,
      { cache: "no-store" }
    );
    const data = (await response.json()) as {
      records?: CampaignMemoryRecord[];
    };

    return data.records || [];
  };

  const saveCampaignMemory = async (paymentResult: PaymentResult) => {
    if (!githubContext || !campaignAssets) {
      return;
    }

    const record: CampaignMemoryRecord = {
      campaign_id: campaign.id,
      campaign_outcome: "Campaign assets delivered; publishing remains manual.",
      created_at: new Date().toISOString(),
      delivery: "Launch thread, launch note, founder replies, and follow-up campaign.",
      goal: campaign.request.goal,
      id: `${campaign.id}-${paymentResult.signature}`,
      payment: {
        amount_sol: paymentResult.settlementSol,
        recipient_wallet: paymentResult.agentWallet,
        signature: paymentResult.signature
      },
      repository: githubContext.fullName,
      specialist_used: specialistDisplayName(campaign.winningBid)
    };

    const response = await fetch("/api/memory/record", {
      body: JSON.stringify(record),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });
    const data = (await response.json()) as {
      record?: CampaignMemoryRecord;
    };

    if (data.record) {
      setCampaignMemory((records) => [data.record as CampaignMemoryRecord, ...records]);
    }
  };

  return (
    <main>
      {isClient ? (
        <WalletStrip
          balanceSol={balanceSol}
          connected={connected}
          connecting={connecting || pendingWalletName !== null}
          disconnect={disconnect}
          isAirdropping={isAirdropping}
          message={walletMessage}
          publicKey={publicKey?.toBase58() || null}
          requestDevnetSol={requestDevnetSol}
          selectWallet={connectWallet}
          wallets={wallets}
        />
      ) : null}

      <section className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-5 py-16 sm:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-medium text-[#71717a]">Relix</p>
          <h1 className="mt-5 text-5xl font-semibold leading-[0.95] tracking-[-0.04em] text-[#0a0a0a] sm:text-7xl md:text-8xl">
            Hire your first AI Growth Employee.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-[#52525b] sm:text-xl">
            Connect GitHub. Give Relix one goal. It reads what shipped, hires a
            specialist, settles payment, and publishes approved X posts.
          </p>
        </div>

        <form
          className="mt-12 grid max-w-2xl gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            void hireEmployee();
          }}
        >
          <GitHubConnection
            githubStatus={githubStatus}
            loading={statusLoading}
            repositories={repositories}
            reposLoading={reposLoading}
            refresh={refreshToolStatuses}
            refreshRepositories={loadRepositories}
            selectedRepo={selectedRepo}
            setSelectedRepo={setSelectedRepo}
          />

          <XConnection
            disconnect={disconnectX}
            loading={statusLoading}
            refresh={refreshToolStatuses}
            xStatus={xStatus}
          />

          <label className="grid gap-2">
            <span className="text-sm font-medium text-[#18181b]">Goal</span>
            <input
              className="field h-14 px-4 text-base"
              value={form.goal}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  goal: event.target.value
                }))
              }
            />
          </label>

          <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-[#18181b]">
                Budget
              </span>
              <div className="relative">
                <input
                  className="field h-14 px-4 pr-14 text-base"
                  min={0}
                  step={0.1}
                  type="number"
                  value={form.budgetSol}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      budgetSol: Number(event.target.value)
                    }))
                  }
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-[#71717a]">
                  SOL
                </span>
              </div>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-[#18181b]">
                Deadline
              </span>
              <input
                className="field h-14 px-4 text-base"
                type="date"
                value={form.deadline}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    deadline: event.target.value
                  }))
                }
              />
            </label>
          </div>

          <button
            className="mt-2 h-14 w-full rounded-full bg-[#0a0a0a] px-6 text-base font-medium text-white transition hover:bg-[#27272a] disabled:opacity-50 sm:w-fit"
            disabled={isRunning}
            type="submit"
          >
            {isRunning ? "Hiring..." : "Hire Employee"}
          </button>

          {integrationError ? (
            <p className="rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-[#52525b] shadow-sm">
              {integrationError}
            </p>
          ) : null}
        </form>
      </section>

      <div ref={flowRef} />

      {(workLog.length > 0 || hasRun) && (
        <section className="mx-auto max-w-5xl px-5 pb-24 sm:px-8">
          <WorkLog entries={workLog} />

          {hasRun &&
          githubContext &&
          campaignAssets &&
          repositoryAnalysis &&
          growthWork ? (
            <div className="enter mt-24 grid gap-24" ref={resultsRef}>
              <BidsSection assets={campaignAssets} campaign={campaign} />
              <WinnerSection
                assets={campaignAssets}
                campaign={campaign}
                memory={campaignMemory}
              />
              <GitHubAnalysisSection
                analysis={repositoryAnalysis}
                context={githubContext}
              />
              <SpecialistDeliverySection
                assets={campaignAssets}
                campaign={campaign}
                copiedAssetId={copiedAssetId}
                isSavingDrafts={isSavingDrafts}
                isScheduling={isScheduling}
                onCopyAsset={copyAsset}
                onCancelPost={cancelScheduledXPost}
                onPublishNow={publishXPostNow}
                onRetryPost={(postId) => publishXPostNow({ postId })}
                onSaveDrafts={saveXPostDrafts}
                onSchedule={scheduleXLaunchPosts}
                publishingPostId={publishingPostId}
                scheduleMessage={scheduleMessage}
                scheduleTime={scheduleTime}
                setScheduleTime={setScheduleTime}
                setXDraftText={(sourceId, text) =>
                  setXDrafts((drafts) => ({ ...drafts, [sourceId]: text }))
                }
                xDrafts={xDrafts}
                xPosts={xPosts}
                xStatus={xStatus}
              />
              <EscrowSection
                connected={connected}
                error={releaseError}
                onRelease={releasePayment}
                payment={payment}
                releaseStatus={releaseStatus}
                winningBid={campaign.winningBid}
              />
              {payment ? (
                <EmployeeWorkSection
                  assets={campaignAssets}
                  isExecuting={isExecutingWork}
                  visibleCount={executedActionCount}
                  work={growthWork}
                />
              ) : null}
            </div>
          ) : null}
        </section>
      )}
    </main>
  );
}

function WalletStrip({
  balanceSol,
  connected,
  connecting,
  disconnect,
  isAirdropping,
  message,
  publicKey,
  requestDevnetSol,
  selectWallet,
  wallets
}: {
  balanceSol: number | null;
  connected: boolean;
  connecting: boolean;
  disconnect: () => Promise<void>;
  isAirdropping: boolean;
  message: string | null;
  publicKey: string | null;
  requestDevnetSol: () => Promise<void>;
  selectWallet: (walletName: WalletName) => void;
  wallets: Wallet[];
}) {
  const phantomWallet = wallets.find(
    ({ adapter }) => String(adapter.name) === "Phantom"
  );
  const phantomReadyState = phantomWallet?.adapter.readyState;
  const canConnectPhantom =
    phantomReadyState === WalletReadyState.Installed ||
    phantomReadyState === WalletReadyState.Loadable;
  const balanceIsLow =
    connected && balanceSol !== null && balanceSol < LOW_BALANCE_SOL;

  return (
    <div className="fixed right-4 top-4 z-20 max-w-[calc(100vw-2rem)] text-right sm:right-6 sm:top-6">
      {connected && publicKey ? (
        <div className="inline-flex flex-wrap items-center justify-end gap-2 rounded-full border hairline bg-white/85 px-3 py-2 text-xs text-[#52525b] shadow-sm backdrop-blur">
          <span>Devnet</span>
          <span className="h-1 w-1 rounded-full bg-[#d4d4d8]" />
          <span>{balanceSol === null ? "..." : `${formatBalance(balanceSol)} SOL`}</span>
          <span className="h-1 w-1 rounded-full bg-[#d4d4d8]" />
          <span>{shortAddress(publicKey)}</span>
          <button
            className="ml-1 text-[#0a0a0a] transition hover:text-[#2563eb]"
            onClick={() => void disconnect()}
            type="button"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <div className="inline-flex flex-wrap justify-end gap-2">
          {phantomWallet && canConnectPhantom ? (
            <button
              className="rounded-full border hairline bg-white/85 px-3 py-2 text-xs font-medium text-[#0a0a0a] shadow-sm backdrop-blur transition hover:border-[#0a0a0a]"
              disabled={connecting}
              onClick={() => selectWallet(phantomWallet.adapter.name)}
              type="button"
            >
              {connecting ? "Connecting..." : "Connect Phantom"}
            </button>
          ) : (
            <a
              className="rounded-full border hairline bg-white/85 px-3 py-2 text-xs font-medium text-[#0a0a0a] shadow-sm backdrop-blur transition hover:border-[#0a0a0a]"
              href={PHANTOM_DOWNLOAD_URL}
              rel="noreferrer"
              target="_blank"
            >
              Get Phantom
            </a>
          )}
        </div>
      )}

      {balanceIsLow ? (
        <div className="mt-2 flex flex-wrap justify-end gap-2 text-xs">
          <button
            className="rounded-full bg-[#0a0a0a] px-3 py-2 font-medium text-white transition hover:bg-[#27272a] disabled:opacity-50"
            disabled={isAirdropping}
            onClick={() => void requestDevnetSol()}
            type="button"
          >
            {isAirdropping ? "Requesting..." : "Get devnet SOL"}
          </button>
          <a
            className="rounded-full border hairline bg-white/85 px-3 py-2 font-medium text-[#52525b] shadow-sm backdrop-blur transition hover:border-[#0a0a0a] hover:text-[#0a0a0a]"
            href={FAUCET_URL}
            rel="noreferrer"
            target="_blank"
          >
            Faucet
          </a>
        </div>
      ) : null}

      {message ? (
        <p className="ml-auto mt-2 max-w-xs rounded-2xl bg-white/90 px-3 py-2 text-xs leading-5 text-[#52525b] shadow-sm backdrop-blur">
          {message}
        </p>
      ) : null}
    </div>
  );
}

function GitHubConnection({
  githubStatus,
  loading,
  repositories,
  reposLoading,
  refresh,
  refreshRepositories,
  selectedRepo,
  setSelectedRepo
}: {
  githubStatus: GitHubStatus;
  loading: boolean;
  repositories: GitHubRepositorySummary[];
  reposLoading: boolean;
  refresh: () => Promise<void>;
  refreshRepositories: () => Promise<void>;
  selectedRepo: string;
  setSelectedRepo: (value: string) => void;
}) {
  return (
    <div className="grid gap-3">
      <ConnectionButton
        connectedLabel={
          githubStatus.user ? `GitHub @${githubStatus.user.login}` : "GitHub connected"
        }
        disabledLabel="GitHub OAuth needs a client secret"
        href="/api/github/login"
        isConfigured={githubStatus.configured}
        isConnected={githubStatus.connected}
        label="Connect GitHub"
        loading={loading}
      />
      {githubStatus.connected ? (
        <div className="grid gap-3">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-[#18181b]">
              Repository
            </span>
            <select
              className="field h-14 px-4 text-base"
              disabled={reposLoading || repositories.length === 0}
              onChange={(event) => setSelectedRepo(event.target.value)}
              value={selectedRepo}
            >
              {repositories.map((repository) => (
                <option key={repository.fullName} value={repository.fullName}>
                  {repository.fullName}
                </option>
              ))}
            </select>
          </label>
          <button
            className="w-fit text-left text-xs text-[#71717a] transition hover:text-[#0a0a0a]"
            onClick={() => void refreshRepositories()}
            type="button"
          >
            {reposLoading ? "Refreshing repositories..." : "Refresh repository data"}
          </button>
        </div>
      ) : (
        <button
          className="w-fit text-left text-xs text-[#71717a] transition hover:text-[#0a0a0a]"
          onClick={() => void refresh()}
          type="button"
        >
          Refresh connection
        </button>
      )}
    </div>
  );
}

function XConnection({
  disconnect,
  loading,
  refresh,
  xStatus
}: {
  disconnect: () => Promise<void>;
  loading: boolean;
  refresh: () => Promise<void>;
  xStatus: XConnectionStatus;
}) {
  if (xStatus.connected && xStatus.account) {
    const missingScopes = missingXWriteScopes(xStatus);

    return (
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-full border border-[#0a0a0a] bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white">
            X @{xStatus.account.username}
          </div>
          <button
            className="text-xs text-[#71717a] transition hover:text-[#0a0a0a]"
            onClick={() => void disconnect()}
            type="button"
          >
            Disconnect X
          </button>
        </div>
        {missingScopes.length > 0 ? (
          <p className="text-xs leading-5 text-[#71717a]">
            X needs {missingScopes.join(", ")}. Enable Read and write
            permissions, save, then reconnect X.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <ConnectionButton
        connectedLabel="X connected"
        disabledLabel={
          xStatus.missing?.length
            ? `X OAuth missing ${xStatus.missing.join(", ")}`
            : "X OAuth needs credentials"
        }
        href="/api/x/connect"
        isConfigured={xStatus.configured}
        isConnected={xStatus.connected}
        label="Connect X"
        loading={loading}
      />
      {xStatus.error ? (
        <p className="text-xs leading-5 text-[#71717a]">{xStatus.error}</p>
      ) : (
        <button
          className="w-fit text-left text-xs text-[#71717a] transition hover:text-[#0a0a0a]"
          onClick={() => void refresh()}
          type="button"
        >
          Refresh X connection
        </button>
      )}
    </div>
  );
}

function ConnectionButton({
  connectedLabel,
  disabledLabel,
  href,
  isConfigured,
  isConnected,
  label,
  loading
}: {
  connectedLabel: string;
  disabledLabel: string;
  href: string;
  isConfigured: boolean;
  isConnected: boolean;
  label: string;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-full border hairline bg-white px-4 py-3 text-sm text-[#71717a]">
        Checking connection
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="rounded-full border border-[#0a0a0a] bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white">
        {connectedLabel}
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div className="rounded-full border hairline bg-white px-4 py-3 text-sm text-[#71717a]">
        {disabledLabel}
      </div>
    );
  }

  return (
    <a
      className="rounded-full border hairline bg-white px-4 py-3 text-sm font-medium text-[#0a0a0a] transition hover:border-[#0a0a0a]"
      href={href}
    >
      {label}
    </a>
  );
}

function WorkLog({ entries }: { entries: WorkLogEntry[] }) {
  return (
    <section className="min-h-[70vh] py-20">
      <div className="mx-auto max-w-2xl">
        <div className="space-y-4">
          {entries.map((entry, index) => {
            const isDone = entry.status === "done";
            const isCurrent = index === entries.length - 1;

            return (
              <div
                className={`enter flex items-center gap-3 text-lg ${
                  isCurrent ? "text-[#0a0a0a]" : "text-[#71717a]"
                }`}
                key={entry.id}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
                    isDone
                      ? "border-[#0a0a0a] bg-[#0a0a0a] text-white"
                      : "border-[#d4d4d8]"
                  }`}
                >
                  {isDone ? "✓" : ""}
                </span>
                <span className="w-12 shrink-0 text-sm text-[#a1a1aa]">
                  {formatLogTime(entry.createdAt)}
                </span>
                <span>{entry.text}</span>
                {!isDone ? (
                  <span className="typing-dot" aria-hidden="true" />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function InsightList({ items, title }: { items: string[]; title: string }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div>
      <p className="text-sm font-medium text-[#18181b]">{title}</p>
      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <p
            className="rounded-2xl bg-[#f4f4f5] px-4 py-3 text-sm leading-6 text-[#27272a]"
            key={item}
          >
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

function GitHubAnalysisSection({
  analysis,
  context
}: {
  analysis: RepositoryAnalysis;
  context: GitHubRepositoryContext;
}) {
  const latestRelease = context.releases[0];
  const commits = context.commits.slice(0, 4);
  const languages = context.languages.slice(0, 4);

  return (
    <section>
      <SectionHeading kicker="GitHub read" title="The employee found the work." />
      <div className="mt-8 rounded-[2rem] border hairline bg-white p-6 soft-shadow sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <a
              className="text-2xl font-semibold tracking-[-0.03em] transition hover:text-[#2563eb]"
              href={context.url}
              rel="noreferrer"
              target="_blank"
            >
              {context.fullName}
            </a>
            <p className="mt-4 text-base leading-7 text-[#52525b]">
              {analysis.repositorySummary}
            </p>
            <p className="mt-6 text-lg leading-8 text-[#27272a]">
              {context.recentSummary}
            </p>
            <p className="mt-5 text-sm text-[#71717a]">
              Last pushed {formatDate(context.pushedAt)}.
            </p>
            {analysis.techStack.length > 0 ? (
              <div className="mt-6 flex flex-wrap gap-2">
                {analysis.techStack.map((item) => (
                  <span
                    className="rounded-full bg-[#f4f4f5] px-3 py-1.5 text-xs font-medium text-[#52525b]"
                    key={item}
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : null}
            {languages.length > 0 ? (
              <div className="mt-6 grid gap-2">
                <p className="text-sm font-medium text-[#18181b]">
                  Languages
                </p>
                <div className="flex flex-wrap gap-2">
                  {languages.map((language) => (
                    <span
                      className="rounded-full bg-[#f4f4f5] px-3 py-1.5 text-xs text-[#52525b]"
                      key={language.name}
                    >
                      {language.name} {Math.round(language.share * 100)}%
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid gap-6">
            <InsightList
              items={analysis.recentProductChanges}
              title="Recent product changes"
            />
            <InsightList
              items={analysis.launchOpportunities}
              title="Launch opportunities"
            />
            <InsightList
              items={analysis.keyProductImprovements}
              title="Key improvements"
            />
            {latestRelease ? (
              <div>
                <p className="text-sm font-medium text-[#18181b]">
                  Release history
                </p>
                <a
                  className="mt-2 block text-base font-medium transition hover:text-[#2563eb]"
                  href={latestRelease.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  {latestRelease.name}
                </a>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#71717a]">
                  {latestRelease.body || "Release notes were empty."}
                </p>
              </div>
            ) : null}

            <div>
              <p className="text-sm font-medium text-[#18181b]">
                Repository timeline
              </p>
              <div className="mt-3 grid gap-3">
                {commits.length > 0 ? (
                  commits.map((commit) => (
                    <a
                      className="group grid gap-1 rounded-2xl bg-[#f4f4f5] px-4 py-3"
                      href={commit.url}
                      key={commit.sha}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <span className="text-sm font-medium leading-6 text-[#27272a] group-hover:text-[#2563eb]">
                        {commit.message}
                      </span>
                      <span className="text-xs text-[#71717a]">
                        {formatDate(commit.date)}
                      </span>
                    </a>
                  ))
                ) : (
                  <p className="rounded-2xl bg-[#f4f4f5] px-4 py-3 text-sm text-[#71717a]">
                    No recent commits were available from GitHub.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BidsSection({
  assets,
  campaign
}: {
  assets: GrowthCampaignAssets;
  campaign: CampaignPlan;
}) {
  return (
    <section>
      <SectionHeading
        kicker="Bids received"
        title="Specialists competed for the job."
      />
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {campaign.bids.map((bid) => (
          <BidCard assets={assets} bid={bid} key={bid.id} />
        ))}
      </div>
    </section>
  );
}

function BidCard({
  assets,
  bid
}: {
  assets: GrowthCampaignAssets;
  bid: Bid;
}) {
  return (
    <article className="rounded-3xl border hairline bg-white p-6 soft-shadow">
      <h3 className="text-xl font-semibold tracking-[-0.02em]">
        {specialistDisplayName(bid)}
      </h3>
      <p className="mt-2 text-sm leading-6 text-[#52525b]">{bid.action}</p>

      <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-[#71717a]">Price</dt>
          <dd className="mt-1 font-medium">{formatSol(bid.priceSol)}</dd>
        </div>
        <div>
          <dt className="text-[#71717a]">Delivery</dt>
          <dd className="mt-1 font-medium">{bid.timeline}</dd>
        </div>
      </dl>

      <p className="mt-6 border-t hairline pt-5 text-sm leading-6 text-[#3f3f46]">
        {bidRepositoryReason(bid, assets)}
      </p>
      <p className="mt-3 text-sm leading-6 text-[#71717a]">
        {bid.differentiation}
      </p>
    </article>
  );
}

function WinnerSection({
  assets,
  campaign,
  memory
}: {
  assets: GrowthCampaignAssets;
  campaign: CampaignPlan;
  memory: CampaignMemoryRecord[];
}) {
  const previousCampaign = memory[0];

  return (
    <section className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-medium text-[#71717a]">Winner selected</p>
      <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
        {specialistDisplayName(campaign.winningBid)} selected.
      </h2>
      <p className="mt-6 text-lg leading-8 text-[#52525b]">
        I selected {specialistDisplayName(campaign.winningBid)} because{" "}
        {assets.repository} shows {assets.productArea}. Launch events work best
        when there is something new for players to experience.
      </p>
      <p className="mx-auto mt-6 max-w-xl text-sm leading-6 text-[#71717a]">
        {assets.opportunity}
      </p>
      <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[#71717a]">
        {previousCampaign
          ? `Memory: last time this repo used ${previousCampaign.specialist_used}. Outcome: ${previousCampaign.campaign_outcome}.`
          : "Memory: no previous Relix campaign for this repository."}
      </p>
    </section>
  );
}

function SpecialistDeliverySection({
  assets,
  campaign,
  copiedAssetId,
  isSavingDrafts,
  isScheduling,
  onCancelPost,
  onCopyAsset,
  onPublishNow,
  onRetryPost,
  onSaveDrafts,
  onSchedule,
  publishingPostId,
  scheduleMessage,
  scheduleTime,
  setScheduleTime,
  setXDraftText,
  xDrafts,
  xPosts,
  xStatus
}: {
  assets: GrowthCampaignAssets;
  campaign: CampaignPlan;
  copiedAssetId: string | null;
  isSavingDrafts: boolean;
  isScheduling: boolean;
  onCancelPost: (postId: string) => Promise<void>;
  onCopyAsset: (id: string, text: string) => Promise<void>;
  onPublishNow: (input: {
    label?: string;
    postId?: string;
    sourceId?: string;
  }) => Promise<void>;
  onRetryPost: (postId: string) => Promise<void>;
  onSaveDrafts: () => Promise<void>;
  onSchedule: () => Promise<void>;
  publishingPostId: string | null;
  scheduleMessage: string | null;
  scheduleTime: string;
  setScheduleTime: (value: string) => void;
  setXDraftText: (sourceId: string, text: string) => void;
  xDrafts: Record<string, string>;
  xPosts: ScheduledXPost[];
  xStatus: XConnectionStatus;
}) {
  return (
    <section>
      <SectionHeading
        kicker="Specialist delivery"
        title={`${specialistDisplayName(
          campaign.winningBid
        )} returned the launch campaign.`}
      />
      <div className="mt-8 rounded-[2rem] border hairline bg-white p-6 soft-shadow sm:p-8">
        <p className="max-w-2xl text-lg leading-8 text-[#27272a]">
          {assets.specialistReport}
        </p>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[#71717a]">
          Source: {assets.repository}. {assets.sourceSummary}
        </p>
        <EvidenceList evidence={assets.evidence} />
        <AssetQueue
          assets={assets}
          copiedAssetId={copiedAssetId}
          onCopyAsset={onCopyAsset}
        />
        <SchedulePanel
          copiedAssetId={copiedAssetId}
          isSavingDrafts={isSavingDrafts}
          isScheduling={isScheduling}
          onCancelPost={onCancelPost}
          onCopyAsset={onCopyAsset}
          onPublishNow={onPublishNow}
          onRetryPost={onRetryPost}
          onSaveDrafts={onSaveDrafts}
          onSchedule={onSchedule}
          publishingPostId={publishingPostId}
          scheduleMessage={scheduleMessage}
          scheduleTime={scheduleTime}
          setScheduleTime={setScheduleTime}
          setXDraftText={setXDraftText}
          xDrafts={xDrafts}
          xPosts={xPosts}
          xStatus={xStatus}
          assets={assets}
        />
      </div>
    </section>
  );
}

function EscrowSection({
  connected,
  winningBid,
  payment,
  error,
  releaseStatus,
  onRelease
}: {
  connected: boolean;
  winningBid: Bid;
  payment: PaymentResult | null;
  error: string | null;
  releaseStatus: ReleaseStatus;
  onRelease: () => Promise<void>;
}) {
  const settlementSol = settlementAmountFor(winningBid.priceSol);
  const isBusy = releaseStatus === "signing" || releaseStatus === "confirming";
  const releaseLabel =
    releaseStatus === "signing"
      ? "Signing transaction..."
      : releaseStatus === "confirming"
        ? "Waiting for confirmation..."
        : connected
          ? "Approve Employee Payment"
          : "Connect wallet to release";
  const paymentRows = [
    {
      label: "Approve Employee Payment",
      complete: releaseStatus !== "idle"
    },
    {
      label: "Signing transaction",
      complete: releaseStatus === "confirming" || payment !== null
    },
    {
      label: "Waiting for confirmation",
      complete: payment !== null
    },
    {
      label: "Confirmed",
      complete: payment !== null
    },
    {
      label: `${specialistDisplayName(winningBid)} paid`,
      complete: payment !== null
    },
    {
      label: "Campaign delivered",
      complete: payment !== null
    }
  ];

  return (
    <section className="mx-auto max-w-xl">
      <SectionHeading kicker="Settlement" title="Approve the handoff." />
      <div className="mt-8 rounded-[2rem] border hairline bg-white p-7 soft-shadow">
        <p className="mb-7 text-sm text-[#71717a]">
          The specialist is paid only after delivery is reviewed.
        </p>
        <div className="space-y-0">
          {paymentRows.map((row, index) => {
            return (
              <div className="grid grid-cols-[1fr_28px] gap-5" key={row.label}>
                <div className="pb-6">
                  <p className="text-lg font-medium tracking-[-0.02em]">
                    {row.label}
                  </p>
                </div>
                <div className="flex flex-col items-center">
                  <div
                    className={`mt-1 h-4 w-4 rounded-full transition ${
                      row.complete ? "bg-[#0a0a0a]" : "border border-[#d4d4d8]"
                    }`}
                  />
                  {index < paymentRows.length - 1 ? (
                    <div className="h-full min-h-8 w-px bg-[#e4e4e7]" />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {payment ? (
          <div className="mt-2 grid gap-4">
            <p className="rounded-2xl bg-[#f4f4f5] px-4 py-3 text-sm font-medium text-[#27272a]">
              ✓ Campaign successfully handed over.
            </p>
            <ProofRow label="Status" value={payment.status} />
            <ProofRow label="Amount" value={formatSol(payment.settlementSol)} />
            <ProofRow label="Agent wallet" value={payment.agentWallet} />
            <ProofRow label="Signature" value={payment.signature} />
            <a
              className="block truncate rounded-full bg-[#0a0a0a] px-5 py-3 text-center text-sm font-medium text-white transition hover:bg-[#27272a]"
              href={payment.explorerUrl}
              rel="noreferrer"
              target="_blank"
            >
              Explorer Link
            </a>
          </div>
        ) : (
          <div className="mt-2 grid gap-4">
            <div className="rounded-2xl bg-[#f4f4f5] px-4 py-3 text-sm text-[#52525b]">
              <p>
                {formatSol(settlementSol)} will move to{" "}
                {specialistDisplayName(winningBid)}.
              </p>
              <p className="mt-2 break-all text-xs text-[#71717a]">
                {winningBid.agentWallet}
              </p>
            </div>
            <button
              className="rounded-full bg-[#0a0a0a] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#27272a] disabled:opacity-50"
              disabled={!connected || isBusy}
              onClick={() => void onRelease()}
              type="button"
            >
              {releaseLabel}
            </button>
            {error ? (
              <p className="rounded-2xl bg-[#f4f4f5] px-4 py-3 text-sm leading-6 text-[#52525b]">
                {error}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

function EmployeeWorkSection({
  assets,
  isExecuting,
  visibleCount,
  work
}: {
  assets: GrowthCampaignAssets;
  isExecuting: boolean;
  visibleCount: number;
  work: GrowthEmployeeWork;
}) {
  const visibleActions = work.actions.slice(0, visibleCount);
  const isComplete = visibleCount >= work.actions.length;

  return (
    <section className="pb-12">
      <SectionHeading
        kicker="Employee summary"
        title={isExecuting ? "Writing today's update." : "Today's work"}
      />

      <div className="mt-8 rounded-[2rem] border hairline bg-white p-6 soft-shadow sm:p-8">
        <div className="grid gap-4">
          {visibleActions.map((action) => (
            <ActionRow action={action} key={action.id} />
          ))}
        </div>

        {isComplete ? (
          <div className="mt-8 border-t hairline pt-8">
            <p className="text-lg font-medium tracking-[-0.02em] text-[#27272a]">
              Next recommendation
            </p>
            <p className="mt-3 text-base leading-8 text-[#52525b]">
              {assets.nextRecommendation}
            </p>
            <p className="mt-6 rounded-2xl bg-[#f4f4f5] px-4 py-3 text-sm font-medium text-[#27272a]">
              ✓ Campaign successfully handed over.
            </p>
          </div>
        ) : (
          <p className="mt-6 text-sm text-[#71717a]">
            Preparing the handover...
          </p>
        )}
      </div>
    </section>
  );
}

function EvidenceList({ evidence }: { evidence: GrowthCampaignAssets["evidence"] }) {
  return (
    <div className="mt-8 grid gap-3 sm:grid-cols-2">
      {evidence.map((item) => (
        <div
          className="rounded-3xl bg-[#f4f4f5] p-4"
          key={`${item.source}-${item.label}-${item.text}`}
        >
          <p className="text-xs font-medium text-[#71717a]">{item.label}</p>
          <p className="mt-2 text-sm leading-6 text-[#27272a]">{item.text}</p>
        </div>
      ))}
    </div>
  );
}

function AssetQueue({
  assets,
  copiedAssetId,
  onCopyAsset
}: {
  assets: GrowthCampaignAssets;
  copiedAssetId: string | null;
  onCopyAsset: (id: string, text: string) => Promise<void>;
}) {
  const copyBlocks = [
    {
      id: "launch-note",
      label: "Launch note",
      text: assets.launchNote
    },
    ...assets.launchThread.map((post, index) => ({
      id: `thread-${index}`,
      label: post.label,
      text: post.text
    })),
    ...assets.founderReplies.map((reply, index) => ({
      id: `reply-${index}`,
      label: reply.prompt,
      text: reply.text
    })),
    {
      id: "follow-up-campaign",
      label: "Follow-up campaign",
      text: assets.followUpCampaign
    }
  ];

  return (
    <div className="mt-10 grid gap-8">
      <div>
        <h3 className="text-2xl font-semibold tracking-[-0.03em]">
          Launch Thread
        </h3>
        <div className="mt-4 grid gap-3">
          {copyBlocks.slice(1, 4).map((block) => (
            <CopyBlock
              block={block}
              copied={copiedAssetId === block.id}
              key={block.id}
              onCopy={onCopyAsset}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-2xl font-semibold tracking-[-0.03em]">
          Launch Note
        </h3>
        <div className="mt-4">
          <CopyBlock
            block={copyBlocks[0]}
            copied={copiedAssetId === copyBlocks[0].id}
            onCopy={onCopyAsset}
          />
        </div>
      </div>

      <div>
        <h3 className="text-2xl font-semibold tracking-[-0.03em]">
          Example Founder Replies
        </h3>
        <div className="mt-4 grid gap-3">
          {copyBlocks.slice(4, 7).map((block) => (
            <CopyBlock
              block={block}
              copied={copiedAssetId === block.id}
              key={block.id}
              onCopy={onCopyAsset}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-2xl font-semibold tracking-[-0.03em]">
          Follow-up Campaign
        </h3>
        <div className="mt-4">
          <CopyBlock
            block={copyBlocks[7]}
            copied={copiedAssetId === copyBlocks[7].id}
            onCopy={onCopyAsset}
          />
        </div>
      </div>
    </div>
  );
}

function SchedulePanel({
  assets,
  copiedAssetId,
  isSavingDrafts,
  isScheduling,
  onCancelPost,
  onCopyAsset,
  onPublishNow,
  onRetryPost,
  onSaveDrafts,
  onSchedule,
  publishingPostId,
  scheduleMessage,
  scheduleTime,
  setScheduleTime,
  setXDraftText,
  xDrafts,
  xPosts,
  xStatus
}: {
  assets: GrowthCampaignAssets;
  copiedAssetId: string | null;
  isSavingDrafts: boolean;
  isScheduling: boolean;
  onCancelPost: (postId: string) => Promise<void>;
  onCopyAsset: (id: string, text: string) => Promise<void>;
  onPublishNow: (input: {
    label?: string;
    postId?: string;
    sourceId?: string;
  }) => Promise<void>;
  onRetryPost: (postId: string) => Promise<void>;
  onSaveDrafts: () => Promise<void>;
  onSchedule: () => Promise<void>;
  publishingPostId: string | null;
  scheduleMessage: string | null;
  scheduleTime: string;
  setScheduleTime: (value: string) => void;
  setXDraftText: (sourceId: string, text: string) => void;
  xDrafts: Record<string, string>;
  xPosts: ScheduledXPost[];
  xStatus: XConnectionStatus;
}) {
  const draftBlocks = assets.launchThread.map((post, index) => {
    const sourceId = `thread-${index}`;

    return {
      label: post.label,
      sourceId,
      text: xDrafts[sourceId] ?? post.text
    };
  });
  const connectedLabel = xStatus.account
    ? `Connected as @${xStatus.account.username}`
    : "Connect X to publish.";

  return (
    <div className="mt-10 border-t hairline pt-8">
      <div className="grid gap-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="text-2xl font-semibold tracking-[-0.03em]">
              X publishing
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#71717a]">
              {connectedLabel}. Nothing is posted without approval.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <input
              className="field h-11 px-4 text-sm"
              onChange={(event) => setScheduleTime(event.target.value)}
              type="datetime-local"
              value={scheduleTime}
            />
            <button
              className="rounded-full border hairline bg-white px-4 py-2.5 text-sm font-medium text-[#27272a] transition hover:border-[#0a0a0a] disabled:opacity-50"
              disabled={!xStatus.connected || isSavingDrafts}
              onClick={() => void onSaveDrafts()}
              type="button"
            >
              {isSavingDrafts ? "Saving..." : "Save drafts"}
            </button>
            <button
              className="rounded-full bg-[#0a0a0a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#27272a] disabled:opacity-50"
              disabled={!xStatus.connected || isScheduling}
              onClick={() => void onSchedule()}
              type="button"
            >
              {isScheduling ? "Scheduling..." : "Approve schedule"}
            </button>
          </div>
        </div>

        <div className="grid gap-3">
          {draftBlocks.map((post) => (
            <XDraftEditor
              copied={copiedAssetId === post.sourceId}
              disabled={!xStatus.connected}
              key={post.sourceId}
              onChange={(text) => setXDraftText(post.sourceId, text)}
              onCopyAsset={onCopyAsset}
              onPublishNow={() =>
                onPublishNow({
                  label: post.label,
                  sourceId: post.sourceId
                })
              }
              post={post}
              publishing={publishingPostId === post.sourceId}
            />
          ))}
        </div>

        {scheduleMessage ? (
          <p className="rounded-2xl bg-[#f4f4f5] px-4 py-3 text-sm leading-6 text-[#52525b]">
            {scheduleMessage}
          </p>
        ) : null}

        <div>
          <p className="text-sm font-medium text-[#18181b]">Post history</p>
          <div className="mt-3 grid gap-3">
            {xPosts.length > 0 ? (
              xPosts.map((post) => (
                <ScheduledXPostRow
                  copied={copiedAssetId === post.sourceId}
                  key={post.id}
                  onCancelPost={onCancelPost}
                  onCopyAsset={onCopyAsset}
                  onRetryPost={onRetryPost}
                  post={post}
                  publishing={publishingPostId === post.id}
                />
              ))
            ) : (
              <p className="rounded-3xl bg-[#f4f4f5] p-5 text-sm leading-6 text-[#71717a]">
                No X posts saved yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function XDraftEditor({
  copied,
  disabled,
  onChange,
  onCopyAsset,
  onPublishNow,
  post,
  publishing
}: {
  copied: boolean;
  disabled: boolean;
  onChange: (text: string) => void;
  onCopyAsset: (id: string, text: string) => Promise<void>;
  onPublishNow: () => Promise<void>;
  post: { label: string; sourceId: string; text: string };
  publishing: boolean;
}) {
  const remaining = 280 - post.text.length;
  const isValid = validXPost(post.text);

  return (
    <div className="rounded-3xl bg-[#f4f4f5] p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-[#18181b]">{post.label}</p>
        <span
          className={`text-xs ${
            remaining < 0 ? "text-[#b91c1c]" : "text-[#71717a]"
          }`}
        >
          {remaining}
        </span>
      </div>
      <textarea
        className="field min-h-28 resize-y px-4 py-3 text-sm leading-6"
        onChange={(event) => onChange(event.target.value)}
        value={post.text}
      />
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="rounded-full bg-white px-3 py-2 text-xs font-medium text-[#27272a] transition hover:bg-[#0a0a0a] hover:text-white"
          onClick={() => void onCopyAsset(post.sourceId, post.text)}
          type="button"
        >
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          className="rounded-full bg-white px-3 py-2 text-xs font-medium text-[#27272a] transition hover:bg-[#0a0a0a] hover:text-white disabled:opacity-50"
          disabled={disabled || !isValid || publishing}
          onClick={() => void onPublishNow()}
          type="button"
        >
          {publishing ? "Publishing..." : "Approve and publish now"}
        </button>
      </div>
    </div>
  );
}

function ScheduledXPostRow({
  copied,
  onCancelPost,
  onCopyAsset,
  onRetryPost,
  post,
  publishing
}: {
  copied: boolean;
  onCancelPost: (postId: string) => Promise<void>;
  onCopyAsset: (id: string, text: string) => Promise<void>;
  onRetryPost: (postId: string) => Promise<void>;
  post: ScheduledXPost;
  publishing: boolean;
}) {
  const composerUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    post.text
  )}`;

  return (
    <div className="rounded-3xl bg-[#f4f4f5] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#18181b]">
            {post.label || "X post"}
          </p>
          <p className="mt-1 text-xs text-[#71717a]">
            {post.scheduledFor
              ? formatSchedule(post.scheduledFor)
              : "No schedule"}{" "}
            · {xStatusLabel(post.status)}
          </p>
        </div>
        {post.xPostUrl ? (
          <a
            className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#52525b] transition hover:text-[#0a0a0a]"
            href={post.xPostUrl}
            rel="noreferrer"
            target="_blank"
          >
            View on X
          </a>
        ) : (
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#52525b]">
            {xStatusLabel(post.status)}
          </span>
        )}
      </div>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#27272a]">
        {post.text}
      </p>
      {post.errorMessage ? (
        <p className="mt-3 text-xs leading-5 text-[#b91c1c]">
          {post.errorMessage}
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          className="rounded-full bg-white px-3 py-2 text-xs font-medium text-[#27272a] transition hover:bg-[#0a0a0a] hover:text-white"
          onClick={() => void onCopyAsset(post.sourceId || post.id, post.text)}
          type="button"
        >
          {copied ? "Copied" : "Copy"}
        </button>
        <a
          className="rounded-full bg-white px-3 py-2 text-xs font-medium text-[#27272a] transition hover:bg-[#0a0a0a] hover:text-white"
          href={composerUrl}
          rel="noreferrer"
          target="_blank"
        >
          Open composer
        </a>
        {post.status === "failed" ? (
          <button
            className="rounded-full bg-white px-3 py-2 text-xs font-medium text-[#27272a] transition hover:bg-[#0a0a0a] hover:text-white disabled:opacity-50"
            disabled={publishing}
            onClick={() => void onRetryPost(post.id)}
            type="button"
          >
            {publishing ? "Publishing..." : "Retry"}
          </button>
        ) : null}
        {post.status === "scheduled" ? (
          <button
            className="rounded-full bg-white px-3 py-2 text-xs font-medium text-[#27272a] transition hover:bg-[#0a0a0a] hover:text-white"
            onClick={() => void onCancelPost(post.id)}
            type="button"
          >
            Cancel schedule
          </button>
        ) : null}
      </div>
    </div>
  );
}

function CopyBlock({
  block,
  copied,
  onCopy
}: {
  block: { id: string; label: string; text: string };
  copied: boolean;
  onCopy: (id: string, text: string) => Promise<void>;
}) {
  return (
    <div className="rounded-3xl bg-[#f4f4f5] p-5">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-medium text-[#18181b]">{block.label}</p>
        <button
          className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#27272a] transition hover:bg-[#0a0a0a] hover:text-white"
          onClick={() => void onCopy(block.id, block.text)}
          type="button"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#27272a]">
        {block.text}
      </p>
    </div>
  );
}

function ActionRow({ action }: { action: EmployeeAction }) {
  return (
    <div className="enter grid gap-3 rounded-3xl bg-[#f4f4f5] p-5 sm:grid-cols-[24px_1fr]">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0a0a0a] text-xs text-white">
        ✓
      </span>
      <div>
        <p className="font-medium tracking-[-0.01em]">{action.title}</p>
        <p className="mt-2 text-sm leading-6 text-[#52525b]">{action.detail}</p>
      </div>
    </div>
  );
}

function SectionHeading({
  kicker,
  title
}: {
  kicker: string;
  title: string;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-[#71717a]">{kicker}</p>
      <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
        {title}
      </h2>
    </div>
  );
}

function ProofRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[#71717a]">{label}</p>
      <p className="mt-1 break-all text-sm font-medium leading-6 text-[#27272a]">
        {value}
      </p>
    </div>
  );
}

function specialistDisplayName(bid: Pick<Bid, "id" | "agentName">) {
  if (bid.id === "tournament") {
    return "Tournament Specialist";
  }

  if (bid.id === "creator-outreach") {
    return "Creator Outreach Specialist";
  }

  if (bid.id === "referral") {
    return "Referral Specialist";
  }

  if (bid.id === "community") {
    return "Community Launch Specialist";
  }

  return bid.agentName.replace("Agent", "Specialist");
}

function bidRepositoryReason(bid: Bid, assets: GrowthCampaignAssets) {
  if (bid.id === "tournament") {
    return `Best fit for ${assets.productArea}. The repository shows a fresh product change, and an event gives new users a reason to try it now.`;
  }

  if (bid.id === "creator-outreach") {
    return `Useful if ${assets.productName} needs proof from gameplay clips, but creator outreach is slower than a launch event.`;
  }

  if (bid.id === "referral") {
    return `Efficient after a seed audience exists. For this repository signal, it should follow the first launch beat.`;
  }

  return `Good for trust and founder presence, but less direct than turning ${assets.opportunityLabel.toLowerCase()} into a live launch moment.`;
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path, { cache: "no-store" });
  const data = (await response.json()) as { error?: string };

  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }

  return data as T;
}

function shortAddress(address: string) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function formatBalance(value: number) {
  if (value < 0.001) {
    return value.toFixed(4);
  }

  return value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "recently";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short"
  }).format(date);
}

function formatSchedule(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Scheduled";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short"
  }).format(date);
}

function formatLogTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function defaultScheduleInput() {
  const date = new Date();
  date.setHours(date.getHours() + 2, 0, 0, 0);

  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);

  return local.toISOString().slice(0, 16);
}

function draftsFromAssets(assets: GrowthCampaignAssets) {
  return assets.launchThread.reduce<Record<string, string>>((drafts, post, index) => {
    drafts[`thread-${index}`] = post.text;
    return drafts;
  }, {});
}

function validXPost(text: string) {
  const length = text.trim().length;

  return length > 0 && text.length <= 280;
}

function upsertClientXPost(posts: ScheduledXPost[], nextPost: ScheduledXPost) {
  const index = posts.findIndex((post) => post.id === nextPost.id);

  if (index === -1) {
    return [nextPost, ...posts];
  }

  return posts.map((post) => (post.id === nextPost.id ? nextPost : post));
}

function missingXWriteScopes(xStatus: XConnectionStatus) {
  const scopes = xStatus.account?.scopes || [];

  return REQUIRED_X_WRITE_SCOPES.filter((scope) => !scopes.includes(scope));
}

function xStatusLabel(status: ScheduledXPost["status"]) {
  if (status === "publishing") {
    return "Publishing";
  }

  if (status === "published") {
    return "Published";
  }

  if (status === "failed") {
    return "Failed";
  }

  if (status === "scheduled") {
    return "Scheduled";
  }

  return "Draft";
}

function humanizeName(name: string) {
  return name
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
