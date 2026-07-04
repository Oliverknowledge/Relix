"use client";

import {
  useConnection,
  useWallet
} from "@solana/wallet-adapter-react";
import {
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction
} from "@solana/web3.js";
import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";
import { MarketActivityTimeline } from "@/app/components/market-activity";
import { PrizePayoutCard } from "@/app/components/prize-payout";
import { RewardLadderCard } from "@/app/components/reward-ladder";
import { AgentProfileModal } from "@/app/components/specialist-ui";
import {
  buildMarketEvents,
  type MarketEvent,
  type MarketEventDraft
} from "@/app/lib/market-events";
import { hasPrizePayouts } from "@/app/lib/prize-pool";
import { hasRewardLadder } from "@/app/lib/reward-ladder";
import {
  chooseBidForPlan,
  createCampaignPlan,
  defaultFounderRequest,
  type Bid,
  type CampaignPlan,
  type CampaignSignals,
  type FounderRequest,
  type PaymentResult,
  formatSol
} from "@/app/lib/campaign";
import {
  createCampaignAssets,
  type GrowthCampaignAssets
} from "@/app/lib/campaign-assets";
import type {
  GoogleAnalyticsMetrics,
  GoogleAnalyticsStatus
} from "@/app/lib/google-analytics";
import type {
  GitHubRepositoryContext,
  GitHubRepositorySummary
} from "@/app/lib/github-tool";
import {
  createGrowthEmployeeWork,
  type GrowthEmployeeWork
} from "@/app/lib/growth-employee";
import type { CampaignMemoryRecord } from "@/app/lib/memory-store";
import {
  getSpecialistAdapter,
  getSpecialistAgent,
  registerPublishedSpecialists,
  seedReputationFor,
  specialistRegistry,
  type SpecialistAgent,
  type SpecialistDelivery,
  type SpecialistId,
  type SpecialistReputation
} from "@/app/lib/specialist-agents";
import type { RepositoryAnalysis } from "@/app/lib/repository-analysis";
import { analyzeRepository } from "@/app/lib/repository-analysis";
import {
  explorerUrl,
  parseSolanaAddress,
  settlementAmountFor
} from "@/app/lib/wallet";
import type { WebsiteAnalysis } from "@/app/lib/website-analysis";
import type {
  ScheduledXPost,
  XConnectionStatus
} from "@/app/lib/x-types";

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

type NextStepPlan = {
  assessment: string;
  goalMet: boolean;
  nextGoal: string;
  recommendation: string;
  shouldContinue: boolean;
};

type WorkLogEntry = {
  createdAt: string;
  id: string;
  status: "active" | "done";
  text: string;
};

type CampaignStatus =
  | "active"
  | "waiting_approval"
  | "completed"
  | "paused"
  | "budget_exhausted";

type CampaignTaskStatus =
  | "pending"
  | "working"
  | "waiting_approval"
  | "completed"
  | "failed";

type CampaignTask = {
  completedAt?: string;
  createdAt: string;
  detail: string;
  id: string;
  owner: string;
  status: CampaignTaskStatus;
  title: string;
};

type ActiveCampaignSnapshot = {
  analyticsMetrics: GoogleAnalyticsMetrics | null;
  campaign: CampaignPlan;
  campaignAssets: GrowthCampaignAssets;
  createdAt: string;
  githubContext: GitHubRepositoryContext;
  growthWork: GrowthEmployeeWork;
  manualPublishedAssetIds: string[];
  payment: PaymentResult;
  repositoryAnalysis: RepositoryAnalysis;
  specialistDelivery: SpecialistDelivery;
  status: CampaignStatus;
  updatedAt: string;
  websiteAnalysis: WebsiteAnalysis | null;
  xPosts: ScheduledXPost[];
};

type FlowStage =
  | "setup"
  | "working"
  | "opportunity"
  | "specialist"
  | "delivery"
  | "payment"
  | "complete";

type DeliveryAssetBlock = {
  id: string;
  kind: "tweet" | "note" | "reply" | "follow-up";
  label: string;
  section: string;
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

const emptyGoogleStatus: GoogleAnalyticsStatus = {
  configured: false,
  connected: false,
  properties: []
};

const emptyXStatus: XConnectionStatus = {
  configured: false,
  connected: false
};
const ACTIVE_CAMPAIGN_STORAGE_KEY = "relix.activeCampaign.v1";
const REQUIRED_X_WRITE_SCOPES = [
  "tweet.read",
  "users.read",
  "tweet.write",
  "offline.access"
];
const setupSteps = [
  {
    title: "Connect your product",
    detail: "GitHub repository, website, and analytics in one place."
  },
  {
    title: "Set one goal and a budget",
    detail: "Relix works within the SOL budget you approve."
  },
  {
    title: "Specialists compete",
    detail: "Independent seller agents bid for the job on the marketplace."
  },
  {
    title: "Approve and it runs",
    detail: "Pay on Solana after delivery; it reports until the goal is met."
  }
];

export default function Home() {
  const { connection } = useConnection();
  const {
    publicKey,
    connected,
    sendTransaction
  } = useWallet();
  const [form, setForm] = useState<FounderRequest>({
    ...defaultFounderRequest,
    budgetSol: 10,
    deadline: "2026-07-18",
    goal: "Get 500 waitlist signups."
  });
  const [campaign, setCampaign] = useState<CampaignPlan | null>(null);
  const [reputation, setReputation] = useState<
    Record<SpecialistId, SpecialistReputation>
  >(seedReputationMap);
  const [profileAgentId, setProfileAgentId] = useState<SpecialistId | null>(
    null
  );
  const [githubStatus, setGithubStatus] =
    useState<GitHubStatus>(emptyGitHubStatus);
  const [googleStatus, setGoogleStatus] =
    useState<GoogleAnalyticsStatus>(emptyGoogleStatus);
  const [repositories, setRepositories] = useState<GitHubRepositorySummary[]>([]);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [selectedAnalyticsProperty, setSelectedAnalyticsProperty] = useState("");
  const [reposLoading, setReposLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [githubContext, setGithubContext] =
    useState<GitHubRepositoryContext | null>(null);
  const [websiteAnalysis, setWebsiteAnalysis] =
    useState<WebsiteAnalysis | null>(null);
  const [analyticsMetrics, setAnalyticsMetrics] =
    useState<GoogleAnalyticsMetrics | null>(null);
  const [repositoryAnalysis, setRepositoryAnalysis] =
    useState<RepositoryAnalysis | null>(null);
  const [campaignMemory, setCampaignMemory] = useState<CampaignMemoryRecord[]>(
    []
  );
  const [campaignAssets, setCampaignAssets] =
    useState<GrowthCampaignAssets | null>(null);
  const [specialistDelivery, setSpecialistDelivery] =
    useState<SpecialistDelivery | null>(null);
  const [growthWork, setGrowthWork] = useState<GrowthEmployeeWork | null>(null);
  const [choosingBidId, setChoosingBidId] = useState<string | null>(null);
  const [nextPlan, setNextPlan] = useState<NextStepPlan | null>(null);
  const [isPlanningNext, setIsPlanningNext] = useState(false);
  const [xStatus, setXStatus] = useState<XConnectionStatus>(emptyXStatus);
  const [workLog, setWorkLog] = useState<WorkLogEntry[]>([]);
  const [marketEvents, setMarketEvents] = useState<MarketEvent[]>([]);
  const marketSeqRef = useRef(0);
  const lastSelectedBidRef = useRef<string | null>(null);
  const [activeStage, setActiveStage] = useState<FlowStage>("setup");
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [integrationError, setIntegrationError] = useState<string | null>(null);
  const [executedActionCount, setExecutedActionCount] = useState(0);
  const [isExecutingWork, setIsExecutingWork] = useState(false);
  const [payment, setPayment] = useState<PaymentResult | null>(null);
  const [releaseError, setReleaseError] = useState<string | null>(null);
  const [releaseStatus, setReleaseStatus] = useState<ReleaseStatus>("idle");
  const [balanceSol, setBalanceSol] = useState<number | null>(null);
  const [copiedAssetId, setCopiedAssetId] = useState<string | null>(null);
  const [scheduleTime, setScheduleTime] = useState(defaultScheduleInput);
  const [xDrafts, setXDrafts] = useState<Record<string, string>>({});
  const [xPosts, setXPosts] = useState<ScheduledXPost[]>([]);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isSavingDrafts, setIsSavingDrafts] = useState(false);
  const [publishingPostId, setPublishingPostId] = useState<string | null>(null);
  const [scheduleMessage, setScheduleMessage] = useState<string | null>(null);
  const [manualPublishedAssetIds, setManualPublishedAssetIds] = useState<
    string[]
  >(() => readActiveCampaignSnapshot()?.manualPublishedAssetIds || []);
  const [campaignStatusOverride, setCampaignStatusOverride] =
    useState<CampaignStatus | null>(() => {
      const status = readActiveCampaignSnapshot()?.status;

      return status && ["paused", "completed"].includes(status)
        ? status
        : null;
    });
  const [activeCampaignSnapshot, setActiveCampaignSnapshot] =
    useState<ActiveCampaignSnapshot | null>(() => readActiveCampaignSnapshot());
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [deliveryRating, setDeliveryRating] = useState<number | null>(null);
  const [isRatingDelivery, setIsRatingDelivery] = useState(false);
  const flowRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const refreshToolStatuses = useCallback(async () => {
    setStatusLoading(true);

    try {
      const [githubResponse, googleResponse, xResponse] = await Promise.all([
        fetch("/api/github/status", { cache: "no-store" }),
        fetch("/api/google/properties", { cache: "no-store" }),
        fetch("/api/x/status", { cache: "no-store" })
      ]);

      setGithubStatus((await githubResponse.json()) as GitHubStatus);
      const nextGoogleStatus =
        (await googleResponse.json()) as GoogleAnalyticsStatus;

      setGoogleStatus(nextGoogleStatus);
      setSelectedAnalyticsProperty((current) => {
        const properties = nextGoogleStatus.properties || [];
        const currentStillReadable = properties.some(
          (property) => property.propertyId === current
        );

        return currentStillReadable ? current : properties[0]?.propertyId || "";
      });
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
      setBalanceSol(null);
    }
  }, [connection, publicKey]);

  // Appends typed events to the visible Market Activity timeline and persists
  // them (local JSON or KV) so the timeline survives a refresh. Sequence numbers
  // stay monotonic across batches via marketSeqRef.
  const emitMarketEvents = useCallback(
    (campaignId: string, repository: string, drafts: MarketEventDraft[]) => {
      if (drafts.length === 0) {
        return;
      }

      const events = buildMarketEvents(
        campaignId,
        repository,
        drafts,
        marketSeqRef.current
      );
      marketSeqRef.current += events.length;

      setMarketEvents((current) => [...current, ...events]);
      void fetch("/api/market-events", {
        body: JSON.stringify({ events }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      }).catch(() => {
        // Non-fatal: the timeline is already shown from local state.
      });
    },
    []
  );

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

  const loadReputation = useCallback(async () => {
    try {
      const response = await fetch("/api/reputation/list", {
        cache: "no-store"
      });
      const data = (await response.json()) as {
        reputation?: Record<SpecialistId, SpecialistReputation>;
      };

      if (data.reputation) {
        setReputation((current) => ({ ...current, ...data.reputation }));
      }
    } catch {
      // Seed reputation from the registry remains in place.
    }
  }, []);

  const loadPublishedSpecialists = useCallback(async () => {
    try {
      const response = await fetch("/api/specialists", { cache: "no-store" });
      const data = (await response.json()) as {
        specialists?: SpecialistAgent[];
      };

      if (data.specialists) {
        registerPublishedSpecialists(data.specialists);
        setReputation((current) => ({
          ...current,
          ...seedReputationFromAgents(data.specialists as SpecialistAgent[])
        }));
      }
    } catch {
      // Published specialists are optional; built-ins still work.
    }
  }, []);

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
      void loadReputation();
      void loadPublishedSpecialists();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadPublishedSpecialists, loadReputation, refreshToolStatuses]);

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
    if (
      !hasRun ||
      !campaign ||
      !githubContext ||
      !campaignAssets ||
      !specialistDelivery ||
      !repositoryAnalysis ||
      !growthWork ||
      !payment
    ) {
      return;
    }

    const snapshot = createActiveCampaignSnapshot({
      analyticsMetrics,
      campaign,
      campaignAssets,
      githubContext,
      growthWork,
      manualPublishedAssetIds,
      payment,
      repositoryAnalysis,
      specialistDelivery,
      statusOverride: campaignStatusOverride,
      websiteAnalysis,
      xPosts
    });

    persistActiveCampaignSnapshot(snapshot);
    const timer = window.setTimeout(() => {
      setActiveCampaignSnapshot(snapshot);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    analyticsMetrics,
    campaign,
    campaignAssets,
    campaignStatusOverride,
    githubContext,
    growthWork,
    hasRun,
    manualPublishedAssetIds,
    payment,
    repositoryAnalysis,
    specialistDelivery,
    websiteAnalysis,
    xPosts
  ]);

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
    if (activeStage === "setup") {
      return;
    }

    const timer = window.setTimeout(() => {
      scrollToElement(
        activeStage === "working" ? flowRef.current : resultsRef.current,
        "smooth"
      );
    }, 80);

    return () => {
      window.clearTimeout(timer);
    };
  }, [activeStage]);

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
          setBalanceSol(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [connection, publicKey]);

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

  // The Growth Employee only recommends a specialist; the founder makes the
  // final hire here. Choosing a different specialist re-points the plan and
  // regenerates the delivery for the specialist actually hired.
  const chooseSpecialist = async (bidId: string) => {
    if (!campaign || choosingBidId) {
      return;
    }

    const chosenPlan = chooseBidForPlan(campaign, bidId);
    const chosenBid = chosenPlan.winningBid;

    // Records the founder's hire on the timeline. Guarded so re-clicking the
    // same specialist does not duplicate events; changing the choice re-emits.
    const emitSelection = () => {
      if (lastSelectedBidRef.current === chosenBid.id) {
        return;
      }
      lastSelectedBidRef.current = chosenBid.id;

      const agent = getSpecialistAgent(chosenBid.specialistId);
      const isOverride = chosenBid.id !== chosenPlan.recommendedBidId;
      const name = specialistDisplayName(chosenBid);

      emitMarketEvents(chosenPlan.id, chosenPlan.jobContext.repository, [
        {
          type: "FOUNDER_SELECTED_SPECIALIST",
          message: `Founder hired ${name} ${
            isOverride
              ? "(override of the Growth Employee's recommendation)"
              : "(the recommended specialist)"
          } at ${formatSol(chosenBid.priceSol)}.`,
          agentName: name,
          walletAddress: agent?.ownerWallet,
          solAmount: chosenBid.priceSol
        },
        {
          type: "SPECIALIST_DELIVERY_RECEIVED",
          message: `${name} (seller) delivered the launch assets for founder review.`,
          agentName: name
        },
        {
          type: "CAMPAIGN_ACTIVE",
          message: `Campaign active — ${name} hired for ${formatSol(
            chosenBid.priceSol
          )}. Payment/escrow is the next step.`,
          agentName: name,
          solAmount: chosenBid.priceSol
        }
      ]);
    };

    // Accepting the recommendation: delivery already exists from the run.
    if (chosenBid.id === campaign.winningBid.id) {
      emitSelection();
      setActiveStage("delivery");
      return;
    }

    setChoosingBidId(bidId);

    try {
      const nextDelivery = await deliverCampaign(
        chosenBid.specialistId,
        chosenPlan.jobContext
      );

      setCampaign(chosenPlan);
      setSpecialistDelivery(nextDelivery);
      setXDrafts(draftsFromDelivery(nextDelivery));

      if (campaignAssets && githubContext) {
        setGrowthWork(
          createGrowthEmployeeWork({
            assets: campaignAssets,
            campaign: chosenPlan,
            github: githubContext,
            specialistName: specialistDisplayName(chosenBid)
          })
        );
      }

      emitSelection();
      setActiveStage("delivery");
    } catch {
      setIntegrationError(
        "Could not prepare the delivery for that specialist. Try again."
      );
    } finally {
      setChoosingBidId(null);
    }
  };

  const releasePayment = async () => {
    if (!campaign) {
      return;
    }

    if (!publicKey || !connected) {
      setReleaseError("Connect a devnet wallet to release payment.");
      setActiveStage("payment");
      return;
    }

    const winningBid = campaign.winningBid;
    const winnerAgent = getSpecialistAgent(winningBid.specialistId);
    const settlementSol = settlementAmountFor(winningBid.priceSol);
    const settlementLamports = Math.round(settlementSol * LAMPORTS_PER_SOL);
    const ownerWalletKey = parseSolanaAddress(winnerAgent.ownerWallet);

    if (campaign.budgetStatus.blocked) {
      setReleaseError(campaign.budgetStatus.message);
      return;
    }

    if (!ownerWalletKey) {
      setReleaseError(
        `${winnerAgent.name} lists an invalid Solana owner wallet, so payment cannot be released. The owner needs to republish the agent with a valid address.`
      );
      return;
    }

    setReleaseError(null);
    setReleaseStatus("signing");

    try {
      const currentLamports = await connection.getBalance(publicKey, "confirmed");
      const currentBalanceSol = currentLamports / LAMPORTS_PER_SOL;

      setBalanceSol(currentBalanceSol);

      if (currentBalanceSol < settlementSol) {
        setReleaseStatus("idle");
        setReleaseError(
          `Insufficient devnet SOL. Payment requires ${formatSol(
            settlementSol
          )}, and the connected wallet has ${formatSol(currentBalanceSol)}.`
        );
        return;
      }

      const latestBlockhash = await connection.getLatestBlockhash("confirmed");
      const transaction = new Transaction({
        feePayer: publicKey,
        recentBlockhash: latestBlockhash.blockhash
      }).add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: ownerWalletKey,
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
        winnerAgent: winnerAgent.name,
        signature,
        explorerUrl: explorerUrl(signature),
        contractAmountSol: winningBid.priceSol,
        settlementSol,
        agentWallet: winnerAgent.ownerWallet,
        founderWallet: publicKey.toBase58(),
        slot
      };

      setPayment(nextPayment);
      setReleaseStatus("confirmed");
      setExecutedActionCount(0);
      setIsExecutingWork(true);
      setActiveStage("complete");
      window.setTimeout(() => {
        scrollToElement(resultsRef.current, "smooth");
      }, 100);
      void refreshBalance();
      void saveCampaignMemory(nextPayment);
      void recordSpecialistPayment(
        winningBid.specialistId,
        nextPayment,
        campaign.jobContext.productName
      );

      const actions = growthWork?.actions || [];
      for (let index = 0; index < actions.length; index += 1) {
        await sleep(420);
        setExecutedActionCount(index + 1);
      }

      setIsExecutingWork(false);
      void planNextMove(nextPayment);
    } catch (error) {
      setReleaseStatus("idle");
      setReleaseError(
        error instanceof Error ? error.message : "Payment release failed."
      );
    }
  };

  const planNextMove = async (paymentResult: PaymentResult) => {
    if (!campaign) {
      return;
    }

    setIsPlanningNext(true);

    try {
      const response = await fetch("/api/campaign/next", {
        body: JSON.stringify({
          analyticsSummary:
            analyticsMetrics?.summary || "Analytics not connected.",
          budgetRemainingSol:
            campaign.request.budgetSol - paymentResult.settlementSol,
          completedSpecialist: specialistDisplayName(campaign.winningBid),
          goal: campaign.request.goal,
          productName: campaign.jobContext.productName,
          repository: campaign.jobContext.repository
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      const data = (await response.json()) as { plan?: NextStepPlan };

      if (data.plan) {
        setNextPlan(data.plan);
      }
    } catch {
      // The completion summary still shows the static recommendation.
    } finally {
      setIsPlanningNext(false);
    }
  };

  const runNextCampaign = () => {
    if (!nextPlan) {
      return;
    }

    setNextPlan(null);
    void hireEmployee(nextPlan.nextGoal);
  };

  const hireEmployee = async (goalOverride?: string) => {
    if (isRunning) {
      return;
    }

    const runGoal = goalOverride?.trim() || form.goal;

    if (!githubStatus.connected) {
      setIntegrationError(
        githubStatus.configured
          ? "Connect GitHub before hiring the employee."
          : "GitHub OAuth is not configured yet. Add the GitHub client secret to complete OAuth."
      );
      return;
    }

    setPayment(null);
    setReleaseError(null);
    setReleaseStatus("idle");
    setExecutedActionCount(0);
    setIsExecutingWork(false);
    setNextPlan(null);
    setWorkLog([]);
    setMarketEvents([]);
    marketSeqRef.current = 0;
    lastSelectedBidRef.current = null;
    setHasRun(false);
    setIntegrationError(null);
    setGithubContext(null);
    setWebsiteAnalysis(null);
    setAnalyticsMetrics(null);
    setRepositoryAnalysis(null);
    setCampaignMemory([]);
    setCampaignAssets(null);
    setSpecialistDelivery(null);
    setGrowthWork(null);
    setDeliveryRating(null);
    setXDrafts({});
    setXPosts([]);
    setScheduleMessage(null);
    setManualPublishedAssetIds([]);
    setCampaignStatusOverride(null);
    setEditingAssetId(null);
    setActiveStage("working");
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

      await addLog("Reading website...", "active", 640);
      const nextWebsite = form.websiteUrl.trim()
        ? await fetchWebsiteAnalysis(form.websiteUrl)
        : websiteNotProvided();

      setWebsiteAnalysis(nextWebsite);
      await addLog(
        nextWebsite.ok ? "Website understood" : "Website could not be analysed",
        "done"
      );

      await addLog("Reading analytics...", "active", 640);
      const nextAnalytics =
        googleStatus.connected
          ? selectedAnalyticsProperty
            ? await fetchAnalyticsMetrics(selectedAnalyticsProperty)
            : analyticsUnavailable(
                googleStatus.propertiesError ||
                  "Analytics is connected, but no readable property was selected."
              )
          : analyticsNotConnected();

      setAnalyticsMetrics(nextAnalytics);
      await addLog(
        nextAnalytics.connected ? "Analytics understood" : nextAnalytics.summary,
        "done"
      );

      const nextRequest: FounderRequest = {
        ...form,
        goal: runGoal,
        description:
          context.description ||
          context.readme.slice(0, 240) ||
          defaultFounderRequest.description,
        gameName: humanizeName(context.name)
      };
      const nextCampaign = await planCampaign(nextRequest, {
        analytics: nextAnalytics,
        github: context,
        reputation,
        website: nextWebsite
      });
      const nextAssets = createCampaignAssets({
        analytics: nextAnalytics,
        github: context,
        website: nextWebsite
      });
      const nextDelivery = await deliverCampaign(
        nextCampaign.winningBid.specialistId,
        nextCampaign.jobContext
      );
      const nextAnalysis = analyzeRepository(context);
      const previousCampaigns = await loadCampaignMemory(context.fullName);
      const nextWork = createGrowthEmployeeWork({
        assets: nextAssets,
        campaign: nextCampaign,
        github: context,
        specialistName: specialistDisplayName(nextCampaign.winningBid)
      });

      activeCampaignId = nextCampaign.id;
      setCampaign(nextCampaign);
      setCampaignAssets(nextAssets);
      setSpecialistDelivery(nextDelivery);
      setRepositoryAnalysis(nextAnalysis);
      setCampaignMemory(previousCampaigns);
      setGrowthWork(nextWork);
      setXDrafts(draftsFromDelivery(nextDelivery));
      await loadXPosts(nextCampaign.id, true);
      void saveActivity(nextCampaign.id, context.fullName, pendingActivity);

      const recommendedBid =
        nextCampaign.bids.find(
          (bid) => bid.id === nextCampaign.recommendedBidId
        ) || nextCampaign.winningBid;
      emitMarketEvents(nextCampaign.id, context.fullName, [
        {
          type: "GROWTH_GOAL_CREATED",
          message: `Founder created a growth goal: "${runGoal}" · budget ${formatSol(
            nextRequest.budgetSol
          )}.`
        },
        {
          type: "PRODUCT_CONTEXT_READ",
          message: `Growth Employee read product context from ${context.fullName} — ${context.commits.length} commits analysed.`
        },
        {
          type: "LAUNCH_OPPORTUNITY_FOUND",
          message: `Launch opportunity found: ${nextAssets.opportunityLabel}.`
        },
        {
          type: "SPECIALIST_JOB_POSTED",
          message: `Growth Employee (buyer) posted a paid job to the specialist marketplace, budget ${formatSol(
            nextRequest.budgetSol
          )}.`
        },
        {
          type: "MARKETPLACE_NOTIFIED",
          message: `Marketplace notified ${nextCampaign.bids.length} seller agents — they are competing for this paid job.`
        },
        ...nextCampaign.bids.map((bid) => ({
          type: "SELLER_AGENT_BID_RECEIVED" as const,
          message: `${specialistDisplayName(bid)} (seller) bid ${formatSol(
            bid.priceSol
          )} for ${bid.deliveryDays}-day delivery.`,
          agentName: specialistDisplayName(bid),
          walletAddress: getSpecialistAgent(bid.specialistId)?.ownerWallet,
          solAmount: bid.priceSol
        })),
        {
          type: "GROWTH_EMPLOYEE_RECOMMENDED_SPECIALIST",
          message: `Growth Employee recommends ${specialistDisplayName(
            recommendedBid
          )} at ${formatSol(recommendedBid.priceSol)}. ${firstSentence(
            nextCampaign.selection.reason
          )}`,
          agentName: specialistDisplayName(recommendedBid),
          solAmount: recommendedBid.priceSol
        }
      ]);

      await addLog("Comparing product and website...", "active", 720);
      await addLog(nextAssets.websiteComparison.summary, "done");
      await addLog("Detecting launch-worthy changes...", "active", 720);
      await addLog(nextAssets.opportunityLabel, "done");
      await addLog("Planning campaign...", "active", 720);
      await addLog("Launch opportunity confirmed", "done");
      await addLog("Checking budget...", "active", 640);
      await addLog(
        nextCampaign.budgetStatus.blocked
          ? "Budget needs attention"
          : nextCampaign.budgetStatus.constrainedByBudget
            ? "Budget changed specialist choice"
            : "Budget fits selected specialist",
        "done"
      );
      await addLog("Searching marketplace...", "active", 980);
      await addLog("41 seller agents online", "done", 520);
      await addLog("Sending job request...", "active", 920);
      await addLog("Waiting for bids...", "active", 1220);

      for (let index = 0; index < nextCampaign.bids.length; index += 1) {
        const bid = nextCampaign.bids[index];

        await sleep(marketplaceBidDelay(index));
        await addLog(
          `${marketplaceResponseName(bid.specialistId)} responded`,
          "done",
          520
        );
      }

      await addLog("Comparing budget, goal, repo fit and delivery...", "active", 760);
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
      setActiveStage("opportunity");
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
      setActiveStage("setup");
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

  const markAssetPublishedManually = (sourceId: string) => {
    setManualPublishedAssetIds((current) =>
      current.includes(sourceId) ? current : [...current, sourceId]
    );
    setScheduleMessage("Marked as published manually.");
  };

  const resumeActiveCampaign = () => {
    if (!activeCampaignSnapshot) {
      return;
    }

    setCampaign(activeCampaignSnapshot.campaign);
    setGithubContext(activeCampaignSnapshot.githubContext);
    setCampaignAssets(activeCampaignSnapshot.campaignAssets);
    setSpecialistDelivery(activeCampaignSnapshot.specialistDelivery);
    setRepositoryAnalysis(activeCampaignSnapshot.repositoryAnalysis);
    setGrowthWork(activeCampaignSnapshot.growthWork);
    setPayment(activeCampaignSnapshot.payment);
    setWebsiteAnalysis(activeCampaignSnapshot.websiteAnalysis);
    setAnalyticsMetrics(activeCampaignSnapshot.analyticsMetrics);
    setXPosts(activeCampaignSnapshot.xPosts || []);
    setManualPublishedAssetIds(
      activeCampaignSnapshot.manualPublishedAssetIds || []
    );
    setCampaignStatusOverride(
      ["paused", "completed"].includes(activeCampaignSnapshot.status)
        ? activeCampaignSnapshot.status
        : null
    );
    setExecutedActionCount(activeCampaignSnapshot.growthWork.actions.length);
    setHasRun(true);
    setActiveStage("complete");

    // Rehydrate the persisted market-activity timeline for the resumed campaign.
    const resumedCampaignId = activeCampaignSnapshot.campaign.id;
    void fetch(
      `/api/market-events?campaignId=${encodeURIComponent(resumedCampaignId)}`,
      { cache: "no-store" }
    )
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { events?: MarketEvent[] } | null) => {
        const events = Array.isArray(data?.events) ? data.events : [];
        setMarketEvents(events);
        marketSeqRef.current = events.reduce(
          (max, event) => Math.max(max, event.seq + 1),
          0
        );
        lastSelectedBidRef.current = null;
      })
      .catch(() => {
        // Non-fatal: resumed flow simply shows an empty timeline.
      });

    window.setTimeout(() => {
      scrollToElement(resultsRef.current, "smooth");
    }, 80);
  };

  const draftPosts = () => {
    if (!specialistDelivery) {
      return [];
    }

    return deliveryBlocksFrom(specialistDelivery)
      .filter((block) => block.section === "Launch Thread")
      .map((block) => ({
        label: block.label,
        sourceId: block.id,
        text: xDrafts[block.id] ?? block.text
      }));
  };

  const saveXPostDrafts = async () => {
    if (!campaign || !campaignAssets || isSavingDrafts) {
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
    if (!campaign || !campaignAssets || isScheduling) {
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

  const scheduleSingleXPost = async ({
    label,
    sourceId,
    text
  }: {
    label: string;
    sourceId: string;
    text: string;
  }) => {
    if (!campaign || !campaignAssets || isScheduling) {
      return;
    }

    const scheduledAt = new Date(scheduleTime);

    if (Number.isNaN(scheduledAt.getTime())) {
      setScheduleMessage("Choose a valid schedule time.");
      return;
    }

    if (!validXPost(text)) {
      setScheduleMessage("Each X post must be between 1 and 280 characters.");
      return;
    }

    setIsScheduling(true);
    setScheduleMessage(null);

    try {
      const response = await fetch("/api/x/schedule", {
        body: JSON.stringify({
          campaignId: campaign.id,
          posts: [
            {
              label,
              scheduledFor: scheduledAt.toISOString(),
              sourceId,
              text
            }
          ],
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
        throw new Error(data.error || "Could not schedule X post.");
      }

      setXPosts((posts) =>
        data.posts?.reduce(upsertClientXPost, posts) || posts
      );
      setScheduleMessage(`${label} scheduled.`);
    } catch (error) {
      setScheduleMessage(
        error instanceof Error ? error.message : "Could not schedule X post."
      );
    } finally {
      setIsScheduling(false);
    }
  };

  const publishXPostNow = async ({
    label,
    postId,
    sourceId,
    text: providedText
  }: {
    label?: string;
    postId?: string;
    sourceId?: string;
    text?: string;
  }) => {
    if (!campaign || !campaignAssets || publishingPostId) {
      return;
    }

    const draftText = sourceId
      ? xDrafts[sourceId] ?? draftPosts().find((post) => post.sourceId === sourceId)?.text
      : undefined;
    const text: string =
      postId && !sourceId
        ? ""
        : providedText || draftText || "";

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
      setScheduleMessage(
        data.post.status === "published"
          ? "Published to X."
          : data.error || "X publishing failed. Use copy or the composer link."
      );
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

  const fetchWebsiteAnalysis = async (url: string) => {
    try {
      const response = await fetch("/api/website/analyse", {
        body: JSON.stringify({ url }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });
      const data = (await response.json()) as {
        analysis?: WebsiteAnalysis;
      };

      return data.analysis || websiteNotProvided();
    } catch {
      return {
        ...websiteNotProvided(),
        error: "Website could not be analysed.",
        url
      };
    }
  };

  const fetchAnalyticsMetrics = async (propertyId: string) => {
    try {
      const response = await fetch(
        `/api/google/metrics?propertyId=${encodeURIComponent(propertyId)}`,
        { cache: "no-store" }
      );
      const data = (await response.json()) as {
        metrics?: GoogleAnalyticsMetrics;
      };

      return data.metrics || analyticsNotConnected();
    } catch {
      return analyticsUnavailable("Analytics could not be read.");
    }
  };

  const recordSpecialistPayment = async (
    specialistId: SpecialistId,
    paymentResult: PaymentResult,
    client: string
  ) => {
    try {
      const response = await fetch("/api/reputation/complete", {
        body: JSON.stringify({
          amountSol: paymentResult.settlementSol,
          client,
          hiredAt: new Date().toISOString(),
          signature: paymentResult.signature,
          specialistId
        }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });
      const data = (await response.json()) as {
        reputation?: SpecialistReputation;
      };

      if (data.reputation) {
        setReputation((current) => ({
          ...current,
          [specialistId]: data.reputation as SpecialistReputation
        }));
      }
    } catch {
      // Reputation recording is best-effort; payment already settled.
    }
  };

  const rateDelivery = async (rating: number) => {
    if (!campaign || !payment || isRatingDelivery || deliveryRating !== null) {
      return;
    }

    setIsRatingDelivery(true);

    try {
      const response = await fetch("/api/reputation/rate", {
        body: JSON.stringify({
          rating,
          signature: payment.signature,
          specialistId: campaign.winningBid.specialistId
        }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });
      const data = (await response.json()) as {
        error?: string;
        reputation?: SpecialistReputation;
      };

      if (!response.ok) {
        throw new Error(data.error || "Could not record rating.");
      }

      setDeliveryRating(rating);

      if (data.reputation) {
        setReputation((current) => ({
          ...current,
          [campaign.winningBid.specialistId]:
            data.reputation as SpecialistReputation
        }));
      }
    } catch (error) {
      setReleaseError(
        error instanceof Error ? error.message : "Could not record rating."
      );
    } finally {
      setIsRatingDelivery(false);
    }
  };

  const saveCampaignMemory = async (paymentResult: PaymentResult) => {
    if (!campaign || !githubContext || !campaignAssets) {
      return;
    }

    const record: CampaignMemoryRecord = {
      campaign_id: campaign.id,
      campaign_outcome: "Campaign active; launch approval and results remain open.",
      created_at: new Date().toISOString(),
      delivery: campaign.winningBid.deliverables.join(", "),
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
      {activeStage === "setup" ? (
        <SetupSection
          activeCampaignSnapshot={activeCampaignSnapshot}
          form={form}
          githubStatus={githubStatus}
          googleStatus={googleStatus}
          integrationError={integrationError}
          isRunning={isRunning}
          loading={statusLoading}
          refreshRepositories={loadRepositories}
          refreshToolStatuses={refreshToolStatuses}
          repositories={repositories}
          reposLoading={reposLoading}
          selectedAnalyticsProperty={selectedAnalyticsProperty}
          selectedRepo={selectedRepo}
          setForm={setForm}
          setSelectedAnalyticsProperty={setSelectedAnalyticsProperty}
          setSelectedRepo={setSelectedRepo}
          onResumeCampaign={resumeActiveCampaign}
          submit={hireEmployee}
          xDisconnect={disconnectX}
          xStatus={xStatus}
        />
      ) : null}

      <div ref={flowRef} />

      {activeStage === "working" ? (
        <section className="mx-auto w-full max-w-6xl px-6 pb-24 pt-28 sm:px-8">
          <WorkLog entries={workLog} />
        </section>
      ) : null}

      {marketEvents.length > 0 ? (
        <section
          className={`mx-auto w-full max-w-6xl px-6 pb-6 sm:px-8 ${
            activeStage === "working" ? "" : "pt-28"
          }`}
        >
          <MarketActivityTimeline events={marketEvents} />
        </section>
      ) : null}

      {hasRun &&
      campaign &&
      githubContext &&
      campaignAssets &&
      specialistDelivery &&
      repositoryAnalysis &&
      growthWork &&
      activeStage !== "working" ? (
        <GuidedResultFlow
          activeStage={activeStage}
          analyticsMetrics={analyticsMetrics}
          assets={campaignAssets}
          balanceSol={balanceSol}
          campaign={campaign}
          campaignStatusOverride={campaignStatusOverride}
          choosingBidId={choosingBidId}
          connected={connected}
          copiedAssetId={copiedAssetId}
          delivery={specialistDelivery}
          deliveryRating={deliveryRating}
          editingAssetId={editingAssetId}
          error={releaseError}
          founderWallet={publicKey ? publicKey.toBase58() : null}
          onRewardPaid={refreshBalance}
          isExecutingWork={isExecutingWork}
          isPlanningNext={isPlanningNext}
          isRatingDelivery={isRatingDelivery}
          isSavingDrafts={isSavingDrafts}
          isScheduling={isScheduling}
          manualPublishedAssetIds={manualPublishedAssetIds}
          memory={campaignMemory}
          nextPlan={nextPlan}
          onCancelPost={cancelScheduledXPost}
          onCampaignStatusChange={setCampaignStatusOverride}
          onChooseSpecialist={chooseSpecialist}
          onCopyAsset={copyAsset}
          onEditAsset={setEditingAssetId}
          onMarkPublishedManual={markAssetPublishedManually}
          onOpenProfile={setProfileAgentId}
          onPublishNow={publishXPostNow}
          onRate={rateDelivery}
          onRelease={releasePayment}
          onRunNext={runNextCampaign}
          onRetryPost={(postId) => publishXPostNow({ postId })}
          onSaveDrafts={saveXPostDrafts}
          onScheduleAll={scheduleXLaunchPosts}
          onScheduleOne={scheduleSingleXPost}
          payment={payment}
          publishingPostId={publishingPostId}
          releaseStatus={releaseStatus}
          repositoryAnalysis={repositoryAnalysis}
          repositoryContext={githubContext}
          reputation={reputation}
          resultsRef={resultsRef}
          scheduleMessage={scheduleMessage}
          scheduleTime={scheduleTime}
          setActiveStage={setActiveStage}
          setScheduleTime={setScheduleTime}
          setXDraftText={(sourceId, text) =>
            setXDrafts((drafts) => ({ ...drafts, [sourceId]: text }))
          }
          visibleActionCount={executedActionCount}
          websiteAnalysis={websiteAnalysis}
          work={growthWork}
          xDrafts={xDrafts}
          xPosts={xPosts}
          xStatus={xStatus}
        />
      ) : null}

      {profileAgentId ? (
        <AgentProfileModal
          agent={getSpecialistAgent(profileAgentId)}
          onClose={() => setProfileAgentId(null)}
          reputation={
            reputation[profileAgentId] ||
            seedReputationFor(getSpecialistAgent(profileAgentId))
          }
        />
      ) : null}
    </main>
  );
}

function SetupSection({
  activeCampaignSnapshot,
  form,
  githubStatus,
  googleStatus,
  integrationError,
  isRunning,
  loading,
  refreshRepositories,
  refreshToolStatuses,
  repositories,
  reposLoading,
  selectedAnalyticsProperty,
  selectedRepo,
  setForm,
  setSelectedAnalyticsProperty,
  setSelectedRepo,
  onResumeCampaign,
  submit,
  xDisconnect,
  xStatus
}: {
  activeCampaignSnapshot: ActiveCampaignSnapshot | null;
  form: FounderRequest;
  githubStatus: GitHubStatus;
  googleStatus: GoogleAnalyticsStatus;
  integrationError: string | null;
  isRunning: boolean;
  loading: boolean;
  refreshRepositories: () => Promise<void>;
  refreshToolStatuses: () => Promise<void>;
  repositories: GitHubRepositorySummary[];
  reposLoading: boolean;
  selectedAnalyticsProperty: string;
  selectedRepo: string;
  setForm: Dispatch<SetStateAction<FounderRequest>>;
  setSelectedAnalyticsProperty: (value: string) => void;
  setSelectedRepo: (value: string) => void;
  onResumeCampaign: () => void;
  submit: () => Promise<void>;
  xDisconnect: () => Promise<void>;
  xStatus: XConnectionStatus;
}) {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 pb-24 pt-28 sm:px-8">
      {activeCampaignSnapshot ? (
        <MorningUpdate
          onResume={onResumeCampaign}
          snapshot={activeCampaignSnapshot}
        />
      ) : null}

      <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
        <header className="lg:pt-10">
          <p className="text-sm font-medium text-[#71717a]">Hire</p>
          <h1 className="mt-3 text-4xl font-semibold leading-[1.05] tracking-[-0.035em] text-[#0a0a0a] sm:text-5xl">
            Hire your first AI Growth Employee.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-[#52525b] sm:text-lg">
            Connect your product. Set a goal. Relix hires specialist agents,
            manages your growth budget, executes approved campaign actions,
            measures results, and keeps working until the goal is reached or the
            budget is exhausted.
          </p>

          <ol className="mt-10 grid gap-5">
            {setupSteps.map((step, index) => (
              <li className="flex gap-4" key={step.title}>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border hairline text-xs font-medium text-[#52525b]">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-[#18181b]">
                    {step.title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[#71717a]">
                    {step.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </header>

        <form
          className="grid gap-5 rounded-[2rem] border hairline bg-white p-6 soft-shadow sm:p-8"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <GitHubConnection
            githubStatus={githubStatus}
            loading={loading}
            repositories={repositories}
            reposLoading={reposLoading}
            refresh={refreshToolStatuses}
            refreshRepositories={refreshRepositories}
            selectedRepo={selectedRepo}
            setSelectedRepo={setSelectedRepo}
          />

          <label className="grid gap-2">
            <span className="text-sm font-medium text-[#18181b]">
              Website URL
            </span>
            <input
              className="field h-14 px-4 text-base"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  websiteUrl: event.target.value
                }))
              }
              placeholder="https://getsnowball.app"
              type="url"
              value={form.websiteUrl}
            />
          </label>

          <GoogleAnalyticsConnection
            googleStatus={googleStatus}
            loading={loading}
            refresh={refreshToolStatuses}
            selectedProperty={selectedAnalyticsProperty}
            setSelectedProperty={setSelectedAnalyticsProperty}
          />

          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-[#18181b]">X</p>
              <span className="text-xs text-[#71717a]">Optional</span>
            </div>
            <XConnection
              disconnect={xDisconnect}
              loading={loading}
              refresh={refreshToolStatuses}
              xStatus={xStatus}
            />
          </div>

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
            className="mt-3 h-14 w-full rounded-full bg-[#0a0a0a] px-6 text-base font-medium text-white transition hover:bg-[#27272a] disabled:opacity-50"
            disabled={isRunning}
            type="submit"
          >
            {isRunning ? "Hiring..." : "Hire Growth Employee"}
          </button>

          {integrationError ? (
            <p className="rounded-2xl bg-[#f4f4f5] px-4 py-3 text-sm leading-6 text-[#52525b]">
              {integrationError}
            </p>
          ) : null}
        </form>
      </div>
    </section>
  );
}

function MorningUpdate({
  onResume,
  snapshot
}: {
  onResume: () => void;
  snapshot: ActiveCampaignSnapshot;
}) {
  const summary = campaignSnapshotSummary(snapshot);

  return (
    <div className="mb-12 max-w-4xl rounded-[2rem] border hairline bg-white p-6 soft-shadow">
      <p className="text-sm font-medium text-[#71717a]">Good morning.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium text-[#71717a]">
            Active campaign
          </p>
          <p className="mt-1 text-lg font-semibold tracking-[-0.02em] text-[#18181b]">
            {snapshot.campaign.request.goal}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-[#71717a]">Current status</p>
          <p className="mt-1 text-lg font-semibold tracking-[-0.02em] text-[#18181b]">
            {campaignStatusLabel(snapshot.status)}
          </p>
        </div>
      </div>
      <div className="mt-5">
        <p className="text-xs font-medium text-[#71717a]">Completed</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {summary.completed.map((item) => (
            <span
              className="rounded-full bg-[#f4f4f5] px-3 py-1.5 text-xs font-medium text-[#52525b]"
              key={item}
            >
              {item}
            </span>
          ))}
        </div>
      </div>
      <p className="mt-5 text-sm leading-6 text-[#52525b]">
        {summary.nextRecommendation}
      </p>
      <button
        className="mt-5 rounded-full bg-[#0a0a0a] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#27272a]"
        onClick={onResume}
        type="button"
      >
        Resume campaign
      </button>
    </div>
  );
}

function GuidedResultFlow({
  activeStage,
  analyticsMetrics,
  assets,
  balanceSol,
  campaign,
  campaignStatusOverride,
  choosingBidId,
  connected,
  copiedAssetId,
  delivery,
  deliveryRating,
  editingAssetId,
  error,
  founderWallet,
  isExecutingWork,
  isPlanningNext,
  isRatingDelivery,
  isSavingDrafts,
  isScheduling,
  manualPublishedAssetIds,
  memory,
  nextPlan,
  onCancelPost,
  onCampaignStatusChange,
  onChooseSpecialist,
  onCopyAsset,
  onEditAsset,
  onMarkPublishedManual,
  onOpenProfile,
  onPublishNow,
  onRate,
  onRelease,
  onRewardPaid,
  onRunNext,
  onRetryPost,
  onSaveDrafts,
  onScheduleAll,
  onScheduleOne,
  payment,
  publishingPostId,
  releaseStatus,
  repositoryAnalysis,
  repositoryContext,
  reputation,
  resultsRef,
  scheduleMessage,
  scheduleTime,
  setActiveStage,
  setScheduleTime,
  setXDraftText,
  visibleActionCount,
  websiteAnalysis,
  work,
  xDrafts,
  xPosts,
  xStatus
}: {
  activeStage: FlowStage;
  analyticsMetrics: GoogleAnalyticsMetrics | null;
  assets: GrowthCampaignAssets;
  balanceSol: number | null;
  campaign: CampaignPlan;
  campaignStatusOverride: CampaignStatus | null;
  choosingBidId: string | null;
  connected: boolean;
  copiedAssetId: string | null;
  delivery: SpecialistDelivery;
  deliveryRating: number | null;
  editingAssetId: string | null;
  error: string | null;
  founderWallet: string | null;
  isExecutingWork: boolean;
  isPlanningNext: boolean;
  isRatingDelivery: boolean;
  isSavingDrafts: boolean;
  isScheduling: boolean;
  manualPublishedAssetIds: string[];
  memory: CampaignMemoryRecord[];
  nextPlan: NextStepPlan | null;
  onCancelPost: (postId: string) => Promise<void>;
  onCampaignStatusChange: (status: CampaignStatus) => void;
  onChooseSpecialist: (bidId: string) => Promise<void>;
  onCopyAsset: (id: string, text: string) => Promise<void>;
  onEditAsset: (id: string | null) => void;
  onMarkPublishedManual: (sourceId: string) => void;
  onPublishNow: (input: {
    label?: string;
    postId?: string;
    sourceId?: string;
    text?: string;
  }) => Promise<void>;
  onOpenProfile: (id: SpecialistId) => void;
  onRate: (rating: number) => Promise<void>;
  onRelease: () => Promise<void>;
  onRewardPaid: () => void;
  onRunNext: () => void;
  onRetryPost: (postId: string) => Promise<void>;
  onSaveDrafts: () => Promise<void>;
  onScheduleAll: () => Promise<void>;
  onScheduleOne: (input: {
    label: string;
    sourceId: string;
    text: string;
  }) => Promise<void>;
  payment: PaymentResult | null;
  publishingPostId: string | null;
  releaseStatus: ReleaseStatus;
  repositoryAnalysis: RepositoryAnalysis;
  repositoryContext: GitHubRepositoryContext;
  reputation: Record<SpecialistId, SpecialistReputation>;
  resultsRef: RefObject<HTMLDivElement | null>;
  scheduleMessage: string | null;
  scheduleTime: string;
  setActiveStage: (stage: FlowStage) => void;
  setScheduleTime: (value: string) => void;
  setXDraftText: (sourceId: string, text: string) => void;
  visibleActionCount: number;
  websiteAnalysis: WebsiteAnalysis | null;
  work: GrowthEmployeeWork;
  xDrafts: Record<string, string>;
  xPosts: ScheduledXPost[];
  xStatus: XConnectionStatus;
}) {
  const position = flowStagePosition(activeStage);

  return (
    <section className="mx-auto w-full max-w-6xl px-6 pb-24 pt-28 sm:px-8" ref={resultsRef}>
      <div className="mb-10 grid gap-3">
        <CollapsedStep
          detail={`${campaign.request.goal} · ${formatSol(
            campaign.request.budgetSol
          )} · ${repositoryContext.fullName}`}
          title="Setup complete"
        />
        <CollapsedStep
          detail={`${repositoryContext.commits.length} commits analysed · ${campaign.bids.length} seller agents submitted bids`}
          title="Employee finished the first pass"
        />
        {position > 0 ? (
          <CollapsedStep
            detail={assets.opportunityLabel}
            onOpen={() => setActiveStage("opportunity")}
            title="Launch opportunity found"
          />
        ) : null}
        {position > 1 ? (
          <CollapsedStep
            detail={`${specialistDisplayName(
              campaign.winningBid
            )} · ${formatSol(campaign.winningBid.priceSol)} · ${
              campaign.winningBid.deliveryDays
            } days`}
            onOpen={() => setActiveStage("specialist")}
            title="Specialist selected"
          />
        ) : null}
        {position > 2 ? (
          <CollapsedStep
            detail={`${campaign.winningBid.deliverables.join(", ")} are ready`}
            onOpen={() => setActiveStage("delivery")}
            title="Campaign assets delivered"
          />
        ) : null}
        {position > 3 && payment ? (
          <CollapsedStep
            detail={`${formatSol(payment.settlementSol)} released · confirmed`}
            onOpen={() => setActiveStage("payment")}
            title="Payment settled"
          />
        ) : null}
      </div>

      <div className="enter">
        {activeStage === "opportunity" ? (
          <LaunchOpportunitySection
            assets={assets}
            analyticsMetrics={analyticsMetrics}
            campaign={campaign}
            context={repositoryContext}
            repositoryAnalysis={repositoryAnalysis}
            setActiveStage={setActiveStage}
            websiteAnalysis={websiteAnalysis}
          />
        ) : null}

        {activeStage === "specialist" ? (
          <SpecialistSelectionSection
            campaign={campaign}
            choosingBidId={choosingBidId}
            memory={memory}
            onChooseSpecialist={onChooseSpecialist}
            onOpenProfile={onOpenProfile}
            reputation={reputation}
          />
        ) : null}

        {activeStage === "delivery" ? (
          <SpecialistDeliverySection
            assets={assets}
            campaign={campaign}
            copiedAssetId={copiedAssetId}
            delivery={delivery}
            editingAssetId={editingAssetId}
            founderWallet={founderWallet}
            isSavingDrafts={isSavingDrafts}
            isScheduling={isScheduling}
            manualPublishedAssetIds={manualPublishedAssetIds}
            onCancelPost={onCancelPost}
            onRewardPaid={onRewardPaid}
            onCopyAsset={onCopyAsset}
            onEditAsset={onEditAsset}
            onMarkPublishedManual={onMarkPublishedManual}
            onPublishNow={onPublishNow}
            onRetryPost={onRetryPost}
            onSaveDrafts={onSaveDrafts}
            onSchedule={onScheduleAll}
            onScheduleOne={onScheduleOne}
            publishingPostId={publishingPostId}
            scheduleMessage={scheduleMessage}
            scheduleTime={scheduleTime}
            setActiveStage={setActiveStage}
            setScheduleTime={setScheduleTime}
            setXDraftText={setXDraftText}
            xDrafts={xDrafts}
            xPosts={xPosts}
            xStatus={xStatus}
          />
        ) : null}

        {activeStage === "payment" ? (
          <EscrowSection
            connected={connected}
            deliveryRating={deliveryRating}
            error={error}
            isRatingDelivery={isRatingDelivery}
            onRate={onRate}
            onRelease={onRelease}
            payment={payment}
            balanceSol={balanceSol}
            budgetStatus={campaign.budgetStatus}
            releaseStatus={releaseStatus}
            winningBid={campaign.winningBid}
          />
        ) : null}

        {activeStage === "complete" ? (
          <EmployeeWorkSection
            analyticsMetrics={analyticsMetrics}
            assets={assets}
            campaign={campaign}
            campaignStatusOverride={campaignStatusOverride}
            isExecuting={isExecutingWork}
            isPlanningNext={isPlanningNext}
            isScheduling={isScheduling}
            manualPublishedAssetIds={manualPublishedAssetIds}
            nextPlan={nextPlan}
            onCampaignStatusChange={onCampaignStatusChange}
            onRunNext={onRunNext}
            payment={payment}
            publishingPostId={publishingPostId}
            repositoryAnalysis={repositoryAnalysis}
            visibleCount={visibleActionCount}
            websiteAnalysis={websiteAnalysis}
            work={work}
            xPosts={xPosts}
          />
        ) : null}
      </div>
    </section>
  );
}

function CollapsedStep({
  detail,
  onOpen,
  title
}: {
  detail: string;
  onOpen?: () => void;
  title: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-[#f4f4f5] px-4 py-3 text-sm">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0a0a0a] text-[10px] text-white">
          ✓
        </span>
        <div className="min-w-0">
          <p className="font-medium text-[#18181b]">{title}</p>
          <p className="truncate text-[#71717a]">{detail}</p>
        </div>
      </div>
      {onOpen ? (
        <button
          className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#52525b] transition hover:text-[#0a0a0a]"
          onClick={onOpen}
          type="button"
        >
          Review
        </button>
      ) : null}
    </div>
  );
}

function SignalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#f4f4f5] px-4 py-3">
      <p className="text-xs font-medium text-[#71717a]">{label}</p>
      <p className="mt-1 text-sm leading-6 text-[#27272a]">{value}</p>
    </div>
  );
}

function LaunchOpportunitySection({
  analyticsMetrics,
  assets,
  campaign,
  context,
  repositoryAnalysis,
  setActiveStage,
  websiteAnalysis
}: {
  analyticsMetrics: GoogleAnalyticsMetrics | null;
  assets: GrowthCampaignAssets;
  campaign: CampaignPlan;
  context: GitHubRepositoryContext;
  repositoryAnalysis: RepositoryAnalysis;
  setActiveStage: (stage: FlowStage) => void;
  websiteAnalysis: WebsiteAnalysis | null;
}) {
  const commits = context.commits.slice(0, 3);
  const websitePromise = websiteAnalysis?.ok
    ? websiteAnalysis.promise
    : "Website could not be analysed";
  const analyticsLine =
    analyticsMetrics?.summary || "Analytics not connected";

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-5xl flex-col justify-center">
      <div className="rounded-[2rem] border hairline bg-white p-7 soft-shadow sm:p-10">
        <p className="text-sm font-medium text-[#71717a]">Launch opportunity</p>
        <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-6xl">
          I found something worth launching.
        </h2>
        <p className="mt-6 text-lg leading-8 text-[#52525b]">
          I noticed {assets.productArea}. This is a good opportunity to launch
          because your current goal is {campaign.request.goal.toLowerCase()}
        </p>
        <p className="mt-5 text-base leading-7 text-[#27272a]">
          {assets.opportunity}
        </p>

        <div className="mt-8 grid gap-3 lg:grid-cols-2">
          <SignalRow label="Website" value={websitePromise} />
          <SignalRow label="Comparison" value={assets.websiteComparison.summary} />
          <SignalRow label="Analytics" value={analyticsLine} />
          <SignalRow label="Landing page" value={assets.landingPageRecommendation} />
        </div>

        <div className="mt-8">
          <p className="text-sm font-medium text-[#18181b]">Recent commits</p>
          <div className="mt-3 grid gap-3">
            {commits.length > 0 ? (
              commits.map((commit) => (
                <a
                  className="group rounded-2xl bg-[#f4f4f5] px-4 py-3"
                  href={commit.url}
                  key={commit.sha}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span className="block text-sm font-medium leading-6 text-[#27272a] group-hover:text-[#2563eb]">
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

        {repositoryAnalysis.keyProductImprovements.length > 0 ? (
          <p className="mt-5 text-sm leading-6 text-[#71717a]">
            Key read: {repositoryAnalysis.keyProductImprovements[0]}.
          </p>
        ) : null}

        <button
          className="mt-8 rounded-full bg-[#0a0a0a] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#27272a]"
          onClick={() => setActiveStage("specialist")}
          type="button"
        >
          See who the employee hired
        </button>
      </div>
    </section>
  );
}

function SpecialistSelectionSection({
  campaign,
  choosingBidId,
  memory,
  onChooseSpecialist,
  onOpenProfile,
  reputation
}: {
  campaign: CampaignPlan;
  choosingBidId: string | null;
  memory: CampaignMemoryRecord[];
  onChooseSpecialist: (bidId: string) => Promise<void>;
  onOpenProfile: (id: SpecialistId) => void;
  reputation: Record<SpecialistId, SpecialistReputation>;
}) {
  const previousCampaign = memory[0];
  const recommendedBid =
    campaign.bids.find((bid) => bid.id === campaign.recommendedBidId) ||
    campaign.winningBid;
  const recommendedAgent = getSpecialistAgent(recommendedBid.specialistId);
  const isChoosing = choosingBidId !== null;
  const sortedBids = [...campaign.bids].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return (
    <section className="mx-auto max-w-6xl">
      <SectionHeading
        kicker="Marketplace responses"
        title={`${campaign.bids.length} seller agents responded.`}
      />
      <p className="mt-4 max-w-3xl text-sm leading-6 text-[#71717a]">
        Relix sent one job request to registered seller agents. Your Growth
        Employee reviewed every bid and <strong>recommends</strong> one — but you
        make the final hire. Pick the recommended specialist or override it.
      </p>

      <div className="mt-8 rounded-[2rem] bg-[#f4f4f5] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 pb-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#71717a]">
              Job request
            </p>
            <p className="mt-1 text-sm font-medium text-[#18181b]">
              {campaign.id}
            </p>
          </div>
          <p className="rounded-full bg-white px-3 py-1.5 text-xs text-[#52525b]">
            {campaign.bids.length} responses
          </p>
        </div>

        <div className="mt-4 grid gap-3">
          {sortedBids.map((bid, index) => {
            const agent = getSpecialistAgent(bid.specialistId);
            const selected = bid.id === campaign.recommendedBidId;
            const agentReputation =
              reputation[bid.specialistId] || seedReputationFor(agent);
            const confidence = bidConfidence(campaign, bid);

            return (
              <article
                className={`rounded-[1.5rem] p-4 transition ${
                  selected
                    ? "bg-[#0a0a0a] text-white"
                    : "bg-white text-[#0a0a0a]"
                }`}
                key={bid.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className={`text-[11px] font-medium uppercase tracking-[0.14em] ${
                          selected ? "text-[#a1a1aa]" : "text-[#71717a]"
                        }`}
                      >
                        Response {index + 1}
                      </p>
                      {selected ? (
                        <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-medium text-white">
                          ★ Recommended by your Growth Employee
                        </span>
                      ) : null}
                    </div>
                    <button
                      className="group mt-2 flex min-w-0 items-center gap-3 text-left"
                      onClick={() => onOpenProfile(bid.specialistId)}
                      type="button"
                    >
                      <span
                        aria-hidden="true"
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base ${
                          selected ? "bg-white/10" : "bg-white"
                        }`}
                      >
                        {agent.avatar}
                      </span>
                      <span className="min-w-0">
                        <span className="text-lg font-semibold tracking-[-0.02em] underline-offset-4 group-hover:underline">
                          {agent.name}
                        </span>
                        <span
                          className={`ml-2 text-xs ${
                            selected ? "text-[#a1a1aa]" : "text-[#71717a]"
                          }`}
                        >
                          v{agent.version}
                        </span>
                      </span>
                    </button>
                    <p
                      className={`mt-2 max-w-3xl text-sm leading-6 ${
                        selected ? "text-[#d4d4d8]" : "text-[#52525b]"
                      }`}
                    >
                      {marketplacePitch(bid)}
                    </p>
                    <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-3">
                      <BidMeta
                        dark={selected}
                        label="Owner"
                        value={agent.ownerName}
                      />
                      <BidMeta
                        dark={selected}
                        label="Wallet"
                        value={agent.ownerWallet}
                      />
                      <BidMeta
                        dark={selected}
                        label="Price"
                        value={formatSol(bid.priceSol)}
                      />
                      <BidMeta
                        dark={selected}
                        label="Delivery"
                        value={`${bid.deliveryDays} days`}
                      />
                      <BidMeta
                        dark={selected}
                        label="Confidence"
                        value={confidence}
                      />
                    </div>
                    <div
                      className={`mt-4 rounded-2xl p-3 text-sm leading-6 ${
                        selected
                          ? "bg-white/10 text-[#e4e4e7]"
                          : "bg-[#f4f4f5] text-[#52525b]"
                      }`}
                    >
                      <p
                        className={`text-xs font-medium ${
                          selected ? "text-[#a1a1aa]" : "text-[#71717a]"
                        }`}
                      >
                        Reasoning
                      </p>
                      <p className="mt-1">{bid.reasoning}</p>
                    </div>
                  </div>
                </div>

                {selected ? (
                  <div className="mt-5 grid gap-3 border-t border-white/15 pt-5 text-sm leading-6 text-[#e4e4e7]">
                    <p>Deliverables: {bid.deliverables.join(" · ")}</p>
                    <p>Risk: {bid.risk}</p>
                    <p className="text-xs text-[#a1a1aa]">
                      {reputationLine(agentReputation)}
                    </p>
                  </div>
                ) : null}

                <div
                  className={`mt-5 flex flex-wrap items-center gap-3 border-t pt-5 ${
                    selected ? "border-white/15" : "border-black/5"
                  }`}
                >
                  <button
                    className={`rounded-full px-5 py-2.5 text-sm font-medium transition disabled:opacity-50 ${
                      selected
                        ? "bg-white text-[#0a0a0a] hover:bg-[#e4e4e7]"
                        : "border hairline bg-white text-[#27272a] hover:border-[#0a0a0a]"
                    }`}
                    disabled={isChoosing}
                    onClick={() => void onChooseSpecialist(bid.id)}
                    type="button"
                  >
                    {choosingBidId === bid.id
                      ? "Preparing delivery…"
                      : selected
                        ? `Hire ${agent.name} (recommended)`
                        : `Hire ${agent.name} instead`}
                  </button>
                  <span
                    className={`text-xs ${
                      selected ? "text-[#a1a1aa]" : "text-[#71717a]"
                    }`}
                  >
                    {formatSol(bid.priceSol)} · {bid.deliveryDays}-day delivery
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="mt-8 rounded-[2rem] border hairline bg-white p-7 soft-shadow">
        <p className="text-sm font-medium text-[#71717a]">
          Why your Growth Employee recommends {recommendedAgent.name}
        </p>
        <p className="mt-4 text-xl leading-8 tracking-[-0.02em] text-[#27272a]">
          {campaign.selection.reason}
        </p>
        <p className="mt-4 text-sm leading-6 text-[#52525b]">
          Seller: {recommendedAgent.ownerName} ·{" "}
          {shortAddress(recommendedAgent.ownerWallet)} · v
          {recommendedAgent.version}
        </p>
        <p className="mt-2 text-sm leading-6 text-[#52525b]">
          {campaign.budgetStatus.message}
        </p>
        <p className="mt-4 text-sm leading-6 text-[#71717a]">
          {previousCampaign
            ? `Memory: last time this repo used ${previousCampaign.specialist_used}. Outcome: ${previousCampaign.campaign_outcome}.`
            : "Memory: no previous Relix campaign for this repository."}
        </p>
        <p className="mt-6 text-sm leading-6 text-[#52525b]">
          This is a recommendation, not a decision — the hire happens when you
          pick a specialist above.
        </p>
        <button
          className="mt-4 rounded-full bg-[#0a0a0a] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#27272a] disabled:opacity-50"
          disabled={isChoosing}
          onClick={() => void onChooseSpecialist(recommendedBid.id)}
          type="button"
        >
          {choosingBidId === recommendedBid.id
            ? "Preparing delivery…"
            : `Hire ${recommendedAgent.name} & review delivery`}
        </button>
      </div>
    </section>
  );
}

function BidMeta({
  dark,
  label,
  value
}: {
  dark: boolean;
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className={dark ? "text-[#a1a1aa]" : "text-[#71717a]"}>{label}</p>
      <p
        className={`mt-1 break-all font-medium ${
          dark ? "text-[#f4f4f5]" : "text-[#18181b]"
        }`}
      >
        {value}
      </p>
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

function GoogleAnalyticsConnection({
  googleStatus,
  loading,
  refresh,
  selectedProperty,
  setSelectedProperty
}: {
  googleStatus: GoogleAnalyticsStatus;
  loading: boolean;
  refresh: () => Promise<void>;
  selectedProperty: string;
  setSelectedProperty: (value: string) => void;
}) {
  if (loading) {
    return (
      <div className="rounded-full border hairline bg-white px-4 py-3 text-sm text-[#71717a]">
        Checking Analytics connection
      </div>
    );
  }

  if (!googleStatus.configured) {
    return (
      <div className="grid gap-2">
        <div className="rounded-full border hairline bg-white px-4 py-3 text-sm text-[#71717a]">
          Analytics OAuth needs credentials
        </div>
        <button
          className="w-fit text-left text-xs text-[#71717a] transition hover:text-[#0a0a0a]"
          onClick={() => void refresh()}
          type="button"
        >
          Refresh connection
        </button>
      </div>
    );
  }

  if (!googleStatus.connected) {
    return (
      <div className="grid gap-2">
        <a
          className="w-fit rounded-full border hairline bg-white px-4 py-3 text-sm font-medium text-[#0a0a0a] transition hover:border-[#0a0a0a]"
          href="/api/google/login"
        >
          Connect Google Analytics
        </a>
        {googleStatus.error ? (
          <p className="text-xs leading-5 text-[#71717a]">
            {googleStatus.error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="w-fit rounded-full border border-[#0a0a0a] bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white">
        Google Analytics connected
      </div>
      {googleStatus.properties?.length ? (
        <label className="grid gap-2">
          <span className="text-sm font-medium text-[#18181b]">
            Analytics property
          </span>
          <select
            className="field h-14 px-4 text-base"
            onChange={(event) => setSelectedProperty(event.target.value)}
            value={selectedProperty}
          >
            {googleStatus.properties.map((property) => (
              <option key={property.propertyId} value={property.propertyId}>
                {property.displayName}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="text-xs leading-5 text-[#71717a]">
          {googleStatus.propertiesError ||
            "No readable Analytics properties found. Relix can still work from GitHub and your website."}
        </p>
      )}
      {googleStatus.propertiesError ? (
        <button
          className="w-fit text-left text-xs text-[#71717a] transition hover:text-[#0a0a0a]"
          onClick={() => void refresh()}
          type="button"
        >
          Refresh Analytics
        </button>
      ) : null}
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
      <div className="mx-auto max-w-4xl">
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

function SpecialistDeliverySection({
  assets,
  campaign,
  copiedAssetId,
  delivery,
  editingAssetId,
  founderWallet,
  isSavingDrafts,
  isScheduling,
  manualPublishedAssetIds,
  onCancelPost,
  onCopyAsset,
  onEditAsset,
  onMarkPublishedManual,
  onRewardPaid,
  onPublishNow,
  onRetryPost,
  onSaveDrafts,
  onSchedule,
  onScheduleOne,
  publishingPostId,
  scheduleMessage,
  scheduleTime,
  setActiveStage,
  setScheduleTime,
  setXDraftText,
  xDrafts,
  xPosts,
  xStatus
}: {
  assets: GrowthCampaignAssets;
  campaign: CampaignPlan;
  copiedAssetId: string | null;
  delivery: SpecialistDelivery;
  editingAssetId: string | null;
  founderWallet: string | null;
  isSavingDrafts: boolean;
  isScheduling: boolean;
  manualPublishedAssetIds: string[];
  onCancelPost: (postId: string) => Promise<void>;
  onCopyAsset: (id: string, text: string) => Promise<void>;
  onEditAsset: (id: string | null) => void;
  onMarkPublishedManual: (sourceId: string) => void;
  onRewardPaid: () => void;
  onPublishNow: (input: {
    label?: string;
    postId?: string;
    sourceId?: string;
    text?: string;
  }) => Promise<void>;
  onRetryPost: (postId: string) => Promise<void>;
  onSaveDrafts: () => Promise<void>;
  onSchedule: () => Promise<void>;
  onScheduleOne: (input: {
    label: string;
    sourceId: string;
    text: string;
  }) => Promise<void>;
  publishingPostId: string | null;
  scheduleMessage: string | null;
  scheduleTime: string;
  setActiveStage: (stage: FlowStage) => void;
  setScheduleTime: (value: string) => void;
  setXDraftText: (sourceId: string, text: string) => void;
  xDrafts: Record<string, string>;
  xPosts: ScheduledXPost[];
  xStatus: XConnectionStatus;
}) {
  const blocks = deliveryBlocksFrom(delivery);
  const winnerAgent = getSpecialistAgent(campaign.winningBid.specialistId);
  const showRewardLadder = hasRewardLadder(winnerAgent?.capabilities ?? []);
  const showPrizePayout = hasPrizePayouts(winnerAgent?.capabilities ?? []);
  const hasLaunchThread = blocks.some(
    (block) => block.section === "Launch Thread"
  );
  const connectedLabel = xStatus.account
    ? `Connected as @${xStatus.account.username}`
    : "Connect X to schedule or publish.";

  return (
    <section className="mx-auto max-w-6xl">
      <SectionHeading
        kicker="Specialist delivery"
        title={`${specialistDisplayName(
          campaign.winningBid
        )} delivered the launch assets.`}
      />

      <div className="mt-8 grid gap-8">
        <div className="rounded-[2rem] border hairline bg-white p-6 soft-shadow sm:p-8">
          <p className="max-w-4xl text-lg leading-8 text-[#27272a]">
            {delivery.report}
          </p>
          <p className="mt-4 max-w-4xl text-sm leading-6 text-[#71717a]">
            Source: {assets.repository}. {assets.sourceSummary}
          </p>
        </div>

        {showRewardLadder ? (
          <RewardLadderCard
            campaignId={campaign.id}
            founderWallet={founderWallet}
            onRewardPaid={onRewardPaid}
            repository={assets.repository}
            specialistId={campaign.winningBid.specialistId}
            specialistName={specialistDisplayName(campaign.winningBid)}
          />
        ) : null}

        {showPrizePayout ? (
          <PrizePayoutCard
            campaignId={campaign.id}
            founderWallet={founderWallet}
            onPrizePaid={onRewardPaid}
            repository={assets.repository}
            specialistId={campaign.winningBid.specialistId}
            specialistName={specialistDisplayName(campaign.winningBid)}
          />
        ) : null}

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#18181b]">Publishing</p>
            <p className="mt-1 text-sm leading-6 text-[#71717a]">
              {connectedLabel}. Nothing posts without approval.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              className="field h-11 w-full px-4 text-sm sm:w-56"
              onChange={(event) => setScheduleTime(event.target.value)}
              type="datetime-local"
              value={scheduleTime}
            />
            <button
              className="rounded-full border hairline bg-white px-4 py-2.5 text-sm font-medium text-[#27272a] transition hover:border-[#0a0a0a] disabled:opacity-50"
              disabled={!xStatus.connected || isSavingDrafts || !hasLaunchThread}
              onClick={() => void onSaveDrafts()}
              type="button"
            >
              {isSavingDrafts ? "Saving..." : "Save drafts"}
            </button>
            <button
              className="rounded-full bg-[#0a0a0a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#27272a] disabled:opacity-50"
              disabled={!xStatus.connected || isScheduling || !hasLaunchThread}
              onClick={() => void onSchedule()}
              type="button"
            >
              {isScheduling ? "Scheduling..." : "Schedule thread"}
            </button>
          </div>
        </div>

        {delivery.sections.map((section) => (
          <AssetGroup
            blocks={blocks.filter((block) => block.section === section.title)}
            copiedAssetId={copiedAssetId}
            editingAssetId={editingAssetId}
            isScheduling={isScheduling}
            manualPublishedAssetIds={manualPublishedAssetIds}
            key={section.id}
            onCopyAsset={onCopyAsset}
            onEditAsset={onEditAsset}
            onMarkPublishedManual={onMarkPublishedManual}
            onPublishNow={onPublishNow}
            onScheduleOne={onScheduleOne}
            publishingPostId={publishingPostId}
            setXDraftText={setXDraftText}
            title={section.title}
            xDrafts={xDrafts}
            xPosts={xPosts}
            xStatus={xStatus}
          />
        ))}

        {scheduleMessage ? (
          <p className="rounded-2xl bg-[#f4f4f5] px-4 py-3 text-sm leading-6 text-[#52525b]">
            {scheduleMessage}
          </p>
        ) : null}

        <PostHistory
          copiedAssetId={copiedAssetId}
          onCancelPost={onCancelPost}
          onCopyAsset={onCopyAsset}
          onRetryPost={onRetryPost}
          publishingPostId={publishingPostId}
          xPosts={xPosts}
        />

        <button
          className="w-fit rounded-full bg-[#0a0a0a] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#27272a]"
          onClick={() => setActiveStage("payment")}
          type="button"
        >
          Continue to payment
        </button>
      </div>
    </section>
  );
}

function AssetGroup({
  blocks,
  copiedAssetId,
  editingAssetId,
  isScheduling,
  manualPublishedAssetIds,
  onCopyAsset,
  onEditAsset,
  onMarkPublishedManual,
  onPublishNow,
  onScheduleOne,
  publishingPostId,
  setXDraftText,
  title,
  xDrafts,
  xPosts,
  xStatus
}: {
  blocks: DeliveryAssetBlock[];
  copiedAssetId: string | null;
  editingAssetId: string | null;
  isScheduling: boolean;
  manualPublishedAssetIds: string[];
  onCopyAsset: (id: string, text: string) => Promise<void>;
  onEditAsset: (id: string | null) => void;
  onMarkPublishedManual: (sourceId: string) => void;
  onPublishNow: (input: {
    label?: string;
    sourceId?: string;
    text?: string;
  }) => Promise<void>;
  onScheduleOne: (input: {
    label: string;
    sourceId: string;
    text: string;
  }) => Promise<void>;
  publishingPostId: string | null;
  setXDraftText: (sourceId: string, text: string) => void;
  title: string;
  xDrafts: Record<string, string>;
  xPosts: ScheduledXPost[];
  xStatus: XConnectionStatus;
}) {
  if (blocks.length === 0) {
    return null;
  }

  return (
    <div>
      <h3 className="text-2xl font-semibold tracking-[-0.03em]">{title}</h3>
      <div className="mt-4 grid gap-3">
        {blocks.map((block) => {
          const text = xDrafts[block.id] ?? block.text;

          return (
            <DeliveryAssetCard
              block={block}
              copied={copiedAssetId === block.id}
              editing={editingAssetId === block.id}
              isScheduling={isScheduling}
              key={block.id}
              manualPublished={manualPublishedAssetIds.includes(block.id)}
              onChange={(nextText) => setXDraftText(block.id, nextText)}
              onCopyAsset={onCopyAsset}
              onEditAsset={onEditAsset}
              onMarkPublishedManual={onMarkPublishedManual}
              onPublishNow={onPublishNow}
              onScheduleOne={onScheduleOne}
              publishing={publishingPostId === block.id}
              text={text}
              xPost={xPosts.find((post) => post.sourceId === block.id)}
              xConnected={xStatus.connected}
            />
          );
        })}
      </div>
    </div>
  );
}

function DeliveryAssetCard({
  block,
  copied,
  editing,
  isScheduling,
  manualPublished,
  onChange,
  onCopyAsset,
  onEditAsset,
  onMarkPublishedManual,
  onPublishNow,
  onScheduleOne,
  publishing,
  text,
  xPost,
  xConnected
}: {
  block: DeliveryAssetBlock;
  copied: boolean;
  editing: boolean;
  isScheduling: boolean;
  manualPublished: boolean;
  onChange: (text: string) => void;
  onCopyAsset: (id: string, text: string) => Promise<void>;
  onEditAsset: (id: string | null) => void;
  onMarkPublishedManual: (sourceId: string) => void;
  onPublishNow: (input: {
    label?: string;
    sourceId?: string;
    text?: string;
  }) => Promise<void>;
  onScheduleOne: (input: {
    label: string;
    sourceId: string;
    text: string;
  }) => Promise<void>;
  publishing: boolean;
  text: string;
  xPost?: ScheduledXPost;
  xConnected: boolean;
}) {
  const remaining = 280 - text.length;
  const canSendToX = validXPost(text);
  const isTweet = block.kind === "tweet";
  const actionStatus = assetActionStatus({
    copied,
    manualPublished,
    xPost
  });
  const composerUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    text
  )}`;

  return (
    <article
      className={`rounded-3xl p-5 ${
        isTweet ? "bg-[#f4f4f5]" : "border hairline bg-white"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#18181b]">{block.label}</p>
          <p className="mt-1 text-xs text-[#71717a]">{block.section}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-[#52525b]">
            {actionStatus}
          </span>
          <span
            className={`text-xs ${
              remaining < 0 ? "text-[#b91c1c]" : "text-[#71717a]"
            }`}
          >
            {remaining}
          </span>
        </div>
      </div>

      {editing ? (
        <textarea
          className="field mt-4 min-h-28 resize-y px-4 py-3 text-sm leading-6"
          onChange={(event) => onChange(event.target.value)}
          value={text}
        />
      ) : (
        <div
          className={`mt-4 whitespace-pre-wrap rounded-2xl ${
            isTweet ? "bg-white" : "bg-[#f4f4f5]"
          } px-4 py-4 text-sm leading-7 text-[#27272a]`}
        >
          {text}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="rounded-full bg-white px-3 py-2 text-xs font-medium text-[#27272a] transition hover:bg-[#0a0a0a] hover:text-white"
          onClick={() => void onCopyAsset(block.id, text)}
          type="button"
        >
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          className="rounded-full bg-white px-3 py-2 text-xs font-medium text-[#27272a] transition hover:bg-[#0a0a0a] hover:text-white"
          onClick={() => onEditAsset(editing ? null : block.id)}
          type="button"
        >
          {editing ? "Done" : "Edit"}
        </button>
        <button
          className="rounded-full bg-white px-3 py-2 text-xs font-medium text-[#27272a] transition hover:bg-[#0a0a0a] hover:text-white disabled:opacity-50"
          disabled={!xConnected || !canSendToX || isScheduling}
          onClick={() =>
            void onScheduleOne({
              label: block.label,
              sourceId: block.id,
              text
            })
          }
          type="button"
        >
          {isScheduling ? "Scheduling..." : "Schedule"}
        </button>
        <button
          className="rounded-full bg-white px-3 py-2 text-xs font-medium text-[#27272a] transition hover:bg-[#0a0a0a] hover:text-white disabled:opacity-50"
          disabled={!xConnected || !canSendToX || publishing}
          onClick={() =>
            void onPublishNow({
              label: block.label,
              sourceId: block.id,
              text
            })
          }
          type="button"
        >
          {publishing ? "Publishing..." : "Publish"}
        </button>
        {isTweet && !xConnected ? (
          <>
            <a
              className="rounded-full bg-white px-3 py-2 text-xs font-medium text-[#27272a] transition hover:bg-[#0a0a0a] hover:text-white"
              href={composerUrl}
              rel="noreferrer"
              target="_blank"
            >
              Open X composer
            </a>
            <button
              className="rounded-full bg-white px-3 py-2 text-xs font-medium text-[#27272a] transition hover:bg-[#0a0a0a] hover:text-white"
              onClick={() => onMarkPublishedManual(block.id)}
              type="button"
            >
              Mark as published manually
            </button>
          </>
        ) : null}
      </div>
    </article>
  );
}

function PostHistory({
  copiedAssetId,
  onCancelPost,
  onCopyAsset,
  onRetryPost,
  publishingPostId,
  xPosts
}: {
  copiedAssetId: string | null;
  onCancelPost: (postId: string) => Promise<void>;
  onCopyAsset: (id: string, text: string) => Promise<void>;
  onRetryPost: (postId: string) => Promise<void>;
  publishingPostId: string | null;
  xPosts: ScheduledXPost[];
}) {
  return (
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
  );
}

function EscrowSection({
  balanceSol,
  budgetStatus,
  connected,
  deliveryRating,
  winningBid,
  payment,
  error,
  isRatingDelivery,
  onRate,
  releaseStatus,
  onRelease
}: {
  balanceSol: number | null;
  budgetStatus: CampaignPlan["budgetStatus"];
  connected: boolean;
  deliveryRating: number | null;
  winningBid: Bid;
  payment: PaymentResult | null;
  error: string | null;
  isRatingDelivery: boolean;
  onRate: (rating: number) => Promise<void>;
  releaseStatus: ReleaseStatus;
  onRelease: () => Promise<void>;
}) {
  const winnerAgent = getSpecialistAgent(winningBid.specialistId);
  const ownerWalletValid = parseSolanaAddress(winnerAgent.ownerWallet) !== null;
  const settlementSol = settlementAmountFor(winningBid.priceSol);
  const remainingBudgetAfterPayment = payment
    ? budgetStatus.remainingBudgetSol
    : budgetStatus.requestedBudgetSol - winningBid.priceSol;
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
      label: "Campaign active",
      complete: payment !== null
    }
  ];

  return (
    <section className="mx-auto max-w-3xl">
      <SectionHeading kicker="Payment" title="Approve Employee Payment" />
      <div className="mt-8 rounded-[2rem] border hairline bg-white p-7 soft-shadow">
        <p className="mb-7 text-base leading-7 text-[#52525b]">
          The specialist has completed the requested work. Payment will be
          released after your approval.
        </p>
        <div className="mb-7 grid gap-3 rounded-2xl bg-[#f4f4f5] p-4 text-sm text-[#52525b]">
          <p>{budgetStatus.message}</p>
          <p>
            Remaining campaign budget after specialist:{" "}
            {formatSol(Math.max(0, remainingBudgetAfterPayment))}.
          </p>
          <p>
            Devnet wallet balance:{" "}
            {balanceSol === null ? "not connected" : formatSol(balanceSol)}.
          </p>
        </div>
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
              ✓ Campaign is active.
            </p>
            <ProofRow label="Status" value={payment.status} />
            <ProofRow label="Amount" value={formatSol(payment.settlementSol)} />
            <ProofRow
              label={`Owner wallet (${winnerAgent.ownerName})`}
              value={payment.agentWallet}
            />
            <ProofRow label="Signature" value={payment.signature} />
            <a
              className="block truncate rounded-full bg-[#0a0a0a] px-5 py-3 text-center text-sm font-medium text-white transition hover:bg-[#27272a]"
              href={payment.explorerUrl}
              rel="noreferrer"
              target="_blank"
            >
              Explorer Link
            </a>
            <div className="rounded-2xl bg-[#f4f4f5] px-4 py-4">
              <p className="text-sm font-medium text-[#27272a]">
                {deliveryRating
                  ? `You rated this delivery ${deliveryRating}/5.`
                  : "Rate the delivery"}
              </p>
              {deliveryRating === null ? (
                <>
                  <div className="mt-3 flex gap-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        className="h-10 w-10 rounded-full bg-white text-sm font-medium text-[#27272a] transition hover:bg-[#0a0a0a] hover:text-white disabled:opacity-50"
                        disabled={isRatingDelivery}
                        key={value}
                        onClick={() => void onRate(value)}
                        type="button"
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-xs leading-5 text-[#71717a]">
                    1 to 5 — the rating becomes part of{" "}
                    {winnerAgent.name}
                    {"'"}s marketplace record.
                  </p>
                </>
              ) : (
                <p className="mt-2 text-xs leading-5 text-[#71717a]">
                  Recorded on the seller reputation of {winnerAgent.name}.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-2 grid gap-4">
            <div className="rounded-2xl bg-[#f4f4f5] px-4 py-3 text-sm text-[#52525b]">
              <p>
                Payment will be released to {winnerAgent.name} owned by{" "}
                {winnerAgent.ownerName}.
              </p>
              <p className="mt-2 text-xs text-[#71717a]">
                Amount: {formatSol(settlementSol)} on Solana devnet.
              </p>
              <p className="mt-1 break-all text-xs text-[#71717a]">
                Owner wallet: {winnerAgent.ownerWallet}
              </p>
              {!ownerWalletValid ? (
                <p className="mt-2 text-xs leading-5 text-[#b91c1c]">
                  This owner wallet is not a valid Solana public key, so
                  payment is disabled. The owner needs to republish the agent
                  with a valid address.
                </p>
              ) : null}
            </div>
            <button
              className="rounded-full bg-[#0a0a0a] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#27272a] disabled:opacity-50"
              disabled={
                !connected || budgetStatus.blocked || isBusy || !ownerWalletValid
              }
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
  analyticsMetrics,
  assets,
  campaign,
  campaignStatusOverride,
  isExecuting,
  isPlanningNext,
  isScheduling,
  manualPublishedAssetIds,
  nextPlan,
  onCampaignStatusChange,
  onRunNext,
  payment,
  publishingPostId,
  repositoryAnalysis,
  visibleCount,
  websiteAnalysis,
  work,
  xPosts
}: {
  analyticsMetrics: GoogleAnalyticsMetrics | null;
  assets: GrowthCampaignAssets;
  campaign: CampaignPlan;
  campaignStatusOverride: CampaignStatus | null;
  isExecuting: boolean;
  isPlanningNext: boolean;
  isScheduling: boolean;
  manualPublishedAssetIds: string[];
  nextPlan: NextStepPlan | null;
  onCampaignStatusChange: (status: CampaignStatus) => void;
  onRunNext: () => void;
  payment: PaymentResult | null;
  publishingPostId: string | null;
  repositoryAnalysis: RepositoryAnalysis;
  visibleCount: number;
  websiteAnalysis: WebsiteAnalysis | null;
  work: GrowthEmployeeWork;
  xPosts: ScheduledXPost[];
}) {
  const winnerAgent = getSpecialistAgent(campaign.winningBid.specialistId);
  const budget = campaignBudget(campaign, payment);
  const status = campaignStatus({
    campaign,
    manualPublishedAssetIds,
    override: campaignStatusOverride,
    payment,
    xPosts
  });
  const tasks = campaignJobTasks({
    analyticsMetrics,
    campaign,
    isExecuting,
    isScheduling,
    manualPublishedAssetIds,
    payment,
    publishingPostId,
    specialistName: winnerAgent.name,
    visibleCount,
    xPosts
  });
  const completedCount = tasks.filter((task) => task.status === "completed").length;
  const waitingCount = tasks.filter(
    (task) => task.status === "waiting_approval"
  ).length;
  const recommendation = campaignNextRecommendation({
    analyticsMetrics,
    assets,
    budget,
    campaign,
    repositoryAnalysis,
    status,
    websiteAnalysis,
    xPosts
  });
  const budgetGuard = blockedBudgetAction(campaign, budget.remainingBudgetSol);

  return (
    <section className="mx-auto max-w-6xl pb-12">
      <SectionHeading
        kicker="Campaign"
        title="Campaign active"
      />

      <div className="mt-8 rounded-[2rem] border hairline bg-white p-6 text-left soft-shadow sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b hairline pb-6">
          <div>
            <p className="text-3xl font-semibold tracking-[-0.04em] text-[#0a0a0a]">
              Campaign
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#52525b]">
              Relix keeps working until the goal is reached or the budget is
              exhausted.
            </p>
          </div>
          <div className="rounded-full bg-[#0a0a0a] px-4 py-2 text-sm font-medium text-white">
            Status: {campaignStatusLabel(status)}
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <CampaignMetric label="Goal" value={campaign.request.goal} />
          <CampaignMetric label="Budget" value={formatSol(budget.budgetSol)} />
          <CampaignMetric label="Spent" value={formatSol(budget.spentSol)} />
          <CampaignMetric
            label="Remaining"
            value={formatSol(budget.remainingBudgetSol)}
          />
          <CampaignMetric
            label="Current strategy"
            value={currentStrategyFor(winnerAgent)}
          />
          <CampaignMetric label="Repo" value={campaign.jobContext.repository} />
        </div>

        <div className="mt-8 grid gap-3 border-t hairline pt-8">
          {tasks.map((task) => (
            <CampaignJobTaskRow key={task.id} task={task} />
          ))}
        </div>

        <div className="mt-8 grid gap-6 border-t hairline pt-8 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="text-lg font-medium tracking-[-0.02em] text-[#27272a]">
              Results
            </p>
            <p className="mt-3 text-sm leading-7 text-[#52525b]">
              {analyticsMetrics?.connected
                ? "Waiting for campaign data."
                : "Connect analytics to measure results."}
            </p>
          </div>

          <div>
            <p className="text-lg font-medium tracking-[-0.02em] text-[#27272a]">
              Next recommendation
            </p>
            <p className="mt-3 text-sm leading-7 text-[#52525b]">
              {recommendation || work.nextRecommendation || assets.nextRecommendation}
            </p>
            {budgetGuard ? (
              <p className="mt-3 rounded-2xl bg-[#f4f4f5] px-4 py-3 text-xs leading-5 text-[#52525b]">
                {budgetGuard}
              </p>
            ) : null}
            <p className="mt-4 text-xs leading-5 text-[#71717a]">
              {completedCount} completed · {waitingCount} waiting ·{" "}
              {tasks.length - completedCount - waitingCount} pending or working
            </p>
          </div>
        </div>

        {payment ? (
          <div className="mt-8 border-t hairline pt-8">
            <p className="text-sm font-medium text-[#71717a]">
              Employee&apos;s next move
            </p>
            {isPlanningNext ? (
              <p className="mt-3 flex items-center gap-2 text-sm text-[#52525b]">
                Planning the next campaign
                <span className="typing-dot" aria-hidden="true" />
              </p>
            ) : nextPlan ? (
              <div className="mt-3 grid gap-4">
                <p className="text-base leading-7 text-[#27272a]">
                  {nextPlan.assessment}
                </p>
                <div className="rounded-2xl bg-[#f4f4f5] px-4 py-3">
                  <p className="text-xs font-medium text-[#71717a]">
                    Recommendation
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[#27272a]">
                    {nextPlan.recommendation}
                  </p>
                </div>
                {nextPlan.goalMet ? (
                  <p className="rounded-2xl bg-[#f4f4f5] px-4 py-3 text-sm font-medium text-[#27272a]">
                    ✓ The employee believes the goal is reached.
                  </p>
                ) : nextPlan.shouldContinue ? (
                  <div>
                    <button
                      className="rounded-full bg-[#0a0a0a] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#27272a]"
                      onClick={onRunNext}
                      type="button"
                    >
                      Run the next campaign
                    </button>
                    <p className="mt-2 text-xs leading-5 text-[#71717a]">
                      Next goal: {nextPlan.nextGoal}
                    </p>
                  </div>
                ) : (
                  <p className="rounded-2xl bg-[#f4f4f5] px-4 py-3 text-sm leading-6 text-[#52525b]">
                    The employee is holding here until there is more budget or a
                    new product change to launch.
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-[#52525b]">
                {recommendation || work.nextRecommendation}
              </p>
            )}
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-2 border-t hairline pt-8">
          <button
            className="rounded-full bg-[#f4f4f5] px-4 py-2.5 text-sm font-medium text-[#27272a] transition hover:bg-[#0a0a0a] hover:text-white"
            onClick={() => onCampaignStatusChange("paused")}
            type="button"
          >
            Pause campaign
          </button>
          <button
            className="rounded-full bg-[#f4f4f5] px-4 py-2.5 text-sm font-medium text-[#27272a] transition hover:bg-[#0a0a0a] hover:text-white"
            onClick={() => onCampaignStatusChange("completed")}
            type="button"
          >
            Mark goal reached
          </button>
          <button
            className="rounded-full bg-[#f4f4f5] px-4 py-2.5 text-sm font-medium text-[#27272a] transition hover:bg-[#0a0a0a] hover:text-white"
            onClick={() => onCampaignStatusChange("completed")}
            type="button"
          >
            End campaign
          </button>
        </div>

        {payment ? (
          <div className="mt-8 border-t hairline pt-8">
            <div className="rounded-3xl bg-[#f4f4f5] p-5">
              <p className="text-sm font-medium text-[#18181b]">
                Specialist paid
              </p>
              <p className="mt-2 text-sm leading-6 text-[#52525b]">
                {winnerAgent.name} · {winnerAgent.ownerName}
              </p>
              <p className="mt-1 text-xs text-[#71717a]">
                {formatSol(payment.settlementSol)} released on Solana devnet.
              </p>
              <a
                className="mt-4 block truncate rounded-full bg-white px-4 py-2.5 text-center text-xs font-medium text-[#27272a] transition hover:bg-[#0a0a0a] hover:text-white"
                href={payment.explorerUrl}
                rel="noreferrer"
                target="_blank"
              >
                Explorer
              </a>
            </div>
          </div>
        ) : null}
      </div>
    </section>
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

function CampaignMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-[#f4f4f5] p-4">
      <p className="text-xs font-medium text-[#71717a]">{label}</p>
      <p className="mt-1 break-words text-sm font-medium leading-6 text-[#27272a]">
        {value}
      </p>
    </div>
  );
}

function CampaignJobTaskRow({ task }: { task: CampaignTask }) {
  const completed = task.status === "completed";
  const working = task.status === "working";

  return (
    <div className="enter grid gap-3 rounded-3xl bg-[#f4f4f5] p-5 sm:grid-cols-[24px_1fr_112px] sm:items-start">
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
          completed
            ? "border-[#0a0a0a] bg-[#0a0a0a] text-white"
            : working
              ? "border-[#0a0a0a] bg-white text-[#0a0a0a]"
              : "border-[#d4d4d8] bg-white text-[#a1a1aa]"
        }`}
      >
        {completed ? "✓" : working ? "" : ""}
      </span>
      <div>
        <p className="font-medium tracking-[-0.01em]">{task.title}</p>
        <p className="mt-2 text-sm leading-6 text-[#52525b]">{task.detail}</p>
        <p className="mt-2 text-xs text-[#71717a]">Owner: {task.owner}</p>
      </div>
      <span
        className={`w-fit rounded-full px-3 py-1.5 text-xs font-medium sm:justify-self-end ${
          task.status === "completed"
            ? "bg-[#0a0a0a] text-white"
            : task.status === "working"
              ? "bg-white text-[#0a0a0a]"
              : task.status === "waiting_approval"
                ? "bg-white text-[#52525b]"
                : task.status === "failed"
                  ? "bg-white text-[#b91c1c]"
                : "bg-[#e4e4e7] text-[#71717a]"
        }`}
      >
        {statusLabel(task.status)}
      </span>
    </div>
  );
}

function campaignJobTasks({
  analyticsMetrics,
  campaign,
  isExecuting,
  isScheduling,
  manualPublishedAssetIds,
  payment,
  publishingPostId,
  specialistName,
  visibleCount,
  xPosts
}: {
  analyticsMetrics: GoogleAnalyticsMetrics | null;
  campaign: CampaignPlan;
  isExecuting: boolean;
  isScheduling: boolean;
  manualPublishedAssetIds: string[];
  payment: PaymentResult | null;
  publishingPostId: string | null;
  specialistName: string;
  visibleCount: number;
  xPosts: ScheduledXPost[];
}): CampaignTask[] {
  const createdAt = new Date().toISOString();
  const sequenced = (index: number): CampaignTaskStatus => {
    if (visibleCount > index) {
      return "completed";
    }

    if (isExecuting && visibleCount === index) {
      return "working";
    }

    return "pending";
  };
  const scheduledCount = xPosts.filter((post) =>
    ["scheduled", "publishing", "published"].includes(post.status)
  ).length;
  const publishedCount = xPosts.filter(
    (post) => post.status === "published"
  ).length + manualPublishedAssetIds.length;
  const analyticsCanCollect = Boolean(analyticsMetrics?.connected);

  return [
    {
      completedAt: sequenced(0) === "completed" ? createdAt : undefined,
      createdAt,
      detail: "Repository context and recent commits were read before planning.",
      id: "read-repository",
      owner: "Growth Employee",
      status: sequenced(0),
      title: "Read repository"
    },
    {
      completedAt: sequenced(1) === "completed" ? createdAt : undefined,
      createdAt,
      detail: "The employee identified what changed and why it matters.",
      id: "understand-product",
      owner: "Growth Employee",
      status: sequenced(1),
      title: "Understand product"
    },
    {
      completedAt: sequenced(2) === "completed" ? createdAt : undefined,
      createdAt,
      detail: `Marketplace bids were compared against ${campaign.request.goal.toLowerCase()}.`,
      id: "find-launch-opportunity",
      owner: "Growth Employee",
      status: sequenced(2),
      title: "Find launch opportunity"
    },
    {
      completedAt: sequenced(3) === "completed" ? createdAt : undefined,
      createdAt,
      detail: "Marketplace bids were compared against the goal, budget and deadline.",
      id: "select-specialist",
      owner: "Growth Employee",
      status: sequenced(3),
      title: `Hire ${specialistName}`
    },
    {
      completedAt: sequenced(4) === "completed" ? createdAt : undefined,
      createdAt,
      detail: "The selected specialist prepared the launch thread and supporting copy.",
      id: "generate-launch-thread",
      owner: specialistName,
      status: sequenced(4),
      title: "Prepare launch thread"
    },
    {
      completedAt: payment ? createdAt : undefined,
      createdAt,
      detail: payment
        ? "Founder approval received and payment released."
        : "Waiting for the founder to approve specialist payment.",
      id: "founder-approval",
      owner: "Founder",
      status: payment ? "completed" : "waiting_approval",
      title: "Founder approval"
    },
    {
      completedAt: scheduledCount > 0 ? createdAt : undefined,
      createdAt,
      detail:
        scheduledCount > 0
          ? `${scheduledCount} launch post${scheduledCount === 1 ? "" : "s"} scheduled.`
          : "Waiting for the founder to schedule the approved thread.",
      id: "schedule-x-thread",
      owner: "Founder",
      status:
        scheduledCount > 0
          ? "completed"
          : isScheduling
            ? "working"
            : "waiting_approval",
      title: "Schedule X thread"
    },
    {
      completedAt: publishedCount > 0 ? createdAt : undefined,
      createdAt,
      detail:
        publishedCount > 0
          ? `${publishedCount} launch post${publishedCount === 1 ? "" : "s"} published.`
          : "Ready once the founder approves the launch moment.",
      id: "publish-launch",
      owner: "Founder",
      status:
        publishedCount > 0
          ? "completed"
          : publishingPostId
            ? "working"
            : "pending",
      title: "Publish launch"
    },
    {
      completedAt:
        analyticsCanCollect && publishedCount > 0 ? createdAt : undefined,
      createdAt,
      detail: analyticsCanCollect
        ? publishedCount > 0
          ? "Analytics are connected and ready to review launch performance."
          : "Analytics are connected and waiting for the launch to go live."
        : "Connect analytics after launch to measure traffic and conversion.",
      id: "collect-analytics",
      owner: "Growth Employee",
      status:
        analyticsCanCollect && publishedCount > 0
          ? "completed"
          : publishedCount > 0
            ? "waiting_approval"
            : "pending",
      title: "Collect analytics after 24h"
    },
    {
      createdAt,
      detail: "Relix will choose the next move after the first launch data arrives.",
      id: "decide-next-action",
      owner: "Growth Employee",
      status: publishedCount > 0 ? "working" : "pending",
      title: "Decide next action"
    }
  ];
}

function statusLabel(status: CampaignTaskStatus) {
  if (status === "completed") {
    return "Completed";
  }

  if (status === "working") {
    return "Working";
  }

  if (status === "waiting_approval") {
    return "Waiting approval";
  }

  if (status === "failed") {
    return "Failed";
  }

  return "Pending";
}

function assetActionStatus({
  copied,
  manualPublished,
  xPost
}: {
  copied: boolean;
  manualPublished: boolean;
  xPost?: ScheduledXPost;
}) {
  if (manualPublished || xPost?.status === "published") {
    return "Published";
  }

  if (xPost?.status === "failed") {
    return "Failed";
  }

  if (xPost?.status === "publishing") {
    return "Publishing";
  }

  if (xPost?.status === "scheduled") {
    return "Scheduled";
  }

  if (copied) {
    return "Copied";
  }

  if (xPost?.status === "draft") {
    return "Drafted";
  }

  return "Waiting approval";
}

function campaignBudget(campaign: CampaignPlan, payment: PaymentResult | null) {
  const spentSol = payment?.settlementSol || 0;
  const budgetSol = campaign.request.budgetSol;

  return {
    budgetSol,
    remainingBudgetSol: Number(Math.max(0, budgetSol - spentSol).toFixed(3)),
    spentSol
  };
}

function campaignStatus({
  campaign,
  manualPublishedAssetIds,
  override,
  payment,
  xPosts
}: {
  campaign: CampaignPlan;
  manualPublishedAssetIds: string[];
  override: CampaignStatus | null;
  payment: PaymentResult | null;
  xPosts: ScheduledXPost[];
}): CampaignStatus {
  if (override) {
    return override;
  }

  const budget = campaignBudget(campaign, payment);

  if (budget.remainingBudgetSol <= 0) {
    return "budget_exhausted";
  }

  if (deadlinePassed(campaign.request.deadline)) {
    return "completed";
  }

  const hasPublished = xPosts.some((post) => post.status === "published") ||
    manualPublishedAssetIds.length > 0;

  if (!payment || !hasPublished) {
    return "waiting_approval";
  }

  return "active";
}

function campaignStatusLabel(status: CampaignStatus) {
  if (status === "active") {
    return "Working";
  }

  if (status === "waiting_approval") {
    return "Waiting approval";
  }

  if (status === "budget_exhausted") {
    return "Budget exhausted";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

function currentStrategyFor(agent: SpecialistAgent) {
  const name = agent.name.toLowerCase();

  if (name.includes("tournament")) {
    return "Tournament launch";
  }

  if (name.includes("creator")) {
    return "Creator outreach";
  }

  if (name.includes("referral")) {
    return "Referral loop";
  }

  if (name.includes("community")) {
    return "Community launch";
  }

  return agent.capabilities[0]?.replace(/[-_]+/g, " ") || "Launch campaign";
}

function campaignNextRecommendation({
  analyticsMetrics,
  assets,
  budget,
  campaign,
  repositoryAnalysis,
  status,
  websiteAnalysis,
  xPosts
}: {
  analyticsMetrics: GoogleAnalyticsMetrics | null;
  assets: GrowthCampaignAssets;
  budget: ReturnType<typeof campaignBudget>;
  campaign: CampaignPlan;
  repositoryAnalysis: RepositoryAnalysis;
  status: CampaignStatus;
  websiteAnalysis: WebsiteAnalysis | null;
  xPosts: ScheduledXPost[];
}) {
  const published = xPosts.some((post) => post.status === "published");
  const scheduled = xPosts.some((post) => post.status === "scheduled");
  const productRead =
    repositoryAnalysis.keyProductImprovements[0] || assets.productArea;
  const websiteRead = websiteAnalysis?.ok
    ? ` The website points people to ${websiteAnalysis.primaryCta || "the main call to action"}.`
    : "";

  if (status === "budget_exhausted") {
    return `Budget is exhausted. Pause new spend and review whether ${campaign.request.goal.toLowerCase()} was reached.`;
  }

  if (status === "paused") {
    return "Campaign is paused. Resume only when the founder is ready to approve the next action.";
  }

  if (status === "completed") {
    return "Goal is marked complete. Archive this campaign before starting a new one.";
  }

  if (!scheduled && !published) {
    return `Your budget still has ${formatSol(
      budget.remainingBudgetSol
    )} remaining. Do not spend more until the launch thread is scheduled and has data.`;
  }

  if (!published) {
    return `After the scheduled launch thread goes live, wait 24 hours before spending more budget. The current hook is ${productRead}.${websiteRead}`;
  }

  if (analyticsMetrics?.connected) {
    return "Wait 24 hours, then compare traffic and signup conversion before hiring another specialist.";
  }

  return "After the launch thread is published, connect analytics before hiring another specialist.";
}

function blockedBudgetAction(
  campaign: CampaignPlan,
  remainingBudgetSol: number
) {
  const nextBid = campaign.bids
    .filter((bid) => bid.id !== campaign.winningBid.id)
    .sort((a, b) => b.priceSol - a.priceSol)[0];

  if (!nextBid || nextBid.priceSol <= remainingBudgetSol) {
    return null;
  }

  return `I cannot hire ${specialistDisplayName(nextBid)} because it costs ${formatSol(
    nextBid.priceSol
  )} and the remaining budget is ${formatSol(remainingBudgetSol)}.`;
}

function createActiveCampaignSnapshot({
  analyticsMetrics,
  campaign,
  campaignAssets,
  githubContext,
  growthWork,
  manualPublishedAssetIds,
  payment,
  repositoryAnalysis,
  specialistDelivery,
  statusOverride,
  websiteAnalysis,
  xPosts
}: {
  analyticsMetrics: GoogleAnalyticsMetrics | null;
  campaign: CampaignPlan;
  campaignAssets: GrowthCampaignAssets;
  githubContext: GitHubRepositoryContext;
  growthWork: GrowthEmployeeWork;
  manualPublishedAssetIds: string[];
  payment: PaymentResult;
  repositoryAnalysis: RepositoryAnalysis;
  specialistDelivery: SpecialistDelivery;
  statusOverride: CampaignStatus | null;
  websiteAnalysis: WebsiteAnalysis | null;
  xPosts: ScheduledXPost[];
}): ActiveCampaignSnapshot {
  const now = new Date().toISOString();

  return {
    analyticsMetrics,
    campaign,
    campaignAssets,
    createdAt: payment.signature ? now : now,
    githubContext,
    growthWork,
    manualPublishedAssetIds,
    payment,
    repositoryAnalysis,
    specialistDelivery,
    status: campaignStatus({
      campaign,
      manualPublishedAssetIds,
      override: statusOverride,
      payment,
      xPosts
    }),
    updatedAt: now,
    websiteAnalysis,
    xPosts
  };
}

function campaignSnapshotSummary(snapshot: ActiveCampaignSnapshot) {
  const completed = [
    "Repository analysed",
    `${specialistDisplayName(snapshot.campaign.winningBid)} hired`,
    "Launch thread drafted",
    "Payment settled"
  ];

  if (snapshot.xPosts.some((post) => post.status === "scheduled")) {
    completed.push("Launch thread scheduled");
  }

  if (
    snapshot.xPosts.some((post) => post.status === "published") ||
    snapshot.manualPublishedAssetIds.length > 0
  ) {
    completed.push("Launch post published");
  }

  return {
    completed,
    nextRecommendation: campaignNextRecommendation({
      analyticsMetrics: snapshot.analyticsMetrics,
      assets: snapshot.campaignAssets,
      budget: campaignBudget(snapshot.campaign, snapshot.payment),
      campaign: snapshot.campaign,
      repositoryAnalysis: snapshot.repositoryAnalysis,
      status: snapshot.status,
      websiteAnalysis: snapshot.websiteAnalysis,
      xPosts: snapshot.xPosts
    })
  };
}

function readActiveCampaignSnapshot() {
  try {
    if (typeof window === "undefined") {
      return null;
    }

    const raw = window.localStorage.getItem(ACTIVE_CAMPAIGN_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as ActiveCampaignSnapshot;

    return parsed?.campaign?.id && parsed?.payment?.signature ? parsed : null;
  } catch {
    return null;
  }
}

function persistActiveCampaignSnapshot(snapshot: ActiveCampaignSnapshot) {
  try {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      ACTIVE_CAMPAIGN_STORAGE_KEY,
      JSON.stringify(snapshot)
    );
  } catch {
    // The campaign still works in memory if local storage is unavailable.
  }
}

function deadlinePassed(value: string) {
  const deadline = new Date(value);

  if (Number.isNaN(deadline.getTime())) {
    return false;
  }

  return deadline.getTime() < Date.now();
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

function specialistDisplayName(bid: Pick<Bid, "specialistId">) {
  return getSpecialistAgent(bid.specialistId).name;
}

function seedReputationMap() {
  return seedReputationFromAgents(specialistRegistry);
}

function seedReputationFromAgents(agents: SpecialistAgent[]) {
  return agents.reduce(
    (map, agent) => {
      map[agent.id] = seedReputationFor(agent);
      return map;
    },
    {} as Record<SpecialistId, SpecialistReputation>
  );
}

function reputationLine(reputation: SpecialistReputation) {
  if (reputation.jobsCompleted === 0) {
    return "New seller · no completed jobs yet";
  }

  const rating =
    reputation.averageRating > 0
      ? ` · rated ${reputation.averageRating.toFixed(1)}/5`
      : "";

  return `${reputation.jobsCompleted} jobs · ${formatSol(
    reputation.totalEarnedSol
  )} earned${rating}`;
}

function firstSentence(text: string) {
  const match = text.match(/^[^.!?]*[.!?]/);

  return match ? match[0].trim() : text;
}

function marketplacePitch(bid: Pick<Bid, "reasoning">) {
  const pitch = firstSentence(bid.reasoning).replace(/^"(.+)"$/, "$1");

  return pitch.length > 170 ? `${pitch.slice(0, 167).trim()}...` : pitch;
}

function marketplaceBidDelay(index: number) {
  const delays = [720, 980, 1180, 860];

  return delays[index % delays.length] + Math.floor(index / delays.length) * 220;
}

function marketplaceResponseName(specialistId: SpecialistId) {
  if (specialistId === "tournament") {
    return "Tournament Specialist";
  }

  if (specialistId === "referral") {
    return "Referral Specialist";
  }

  if (specialistId === "community") {
    return "Community Specialist";
  }

  return getSpecialistAgent(specialistId).name;
}

function bidConfidence(campaign: CampaignPlan, bid: Pick<Bid, "id">) {
  const evaluation = campaign.selection.evaluations.find(
    (entry) => entry.bidId === bid.id
  );

  if (!evaluation) {
    return "Reviewing";
  }

  if (evaluation.total >= 7.2) {
    return "High";
  }

  if (evaluation.total >= 5.4) {
    return "Medium";
  }

  return "Low";
}

function flowStagePosition(stage: FlowStage) {
  const order: FlowStage[] = [
    "opportunity",
    "specialist",
    "delivery",
    "payment",
    "complete"
  ];

  return order.indexOf(stage);
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path, { cache: "no-store" });
  const data = (await response.json()) as { error?: string };

  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }

  return data as T;
}

// Plan the campaign on the server so each seller agent bids with its own Claude
// model and the buyer agent chooses. Falls back to the deterministic local
// engine if the route fails (e.g. no ANTHROPIC_API_KEY).
async function planCampaign(
  request: FounderRequest,
  signals: CampaignSignals
): Promise<CampaignPlan> {
  try {
    const response = await fetch("/api/campaign/plan", {
      body: JSON.stringify({
        analytics: signals.analytics,
        github: signals.github,
        reputation: signals.reputation,
        request,
        website: signals.website
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });
    const data = (await response.json()) as {
      error?: string;
      plan?: CampaignPlan;
    };

    if (!response.ok || !data.plan) {
      throw new Error(data.error || "Plan request failed.");
    }

    return data.plan;
  } catch {
    return createCampaignPlan(request, signals);
  }
}

async function deliverCampaign(
  specialistId: string,
  jobContext: CampaignPlan["jobContext"]
): Promise<SpecialistDelivery> {
  try {
    const response = await fetch("/api/campaign/deliver", {
      body: JSON.stringify({ jobContext, specialistId }),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });
    const data = (await response.json()) as {
      delivery?: SpecialistDelivery;
      error?: string;
    };

    if (!response.ok || !data.delivery) {
      throw new Error(data.error || "Delivery request failed.");
    }

    return data.delivery;
  } catch {
    return getSpecialistAdapter(specialistId).deliver({
      bid: {
        createdAt: new Date().toISOString(),
        deliverables: [],
        deliveryDays: 0,
        id: `bid-${jobContext.jobId}-${specialistId}`,
        jobId: jobContext.jobId,
        priceSol: 0,
        reasoning: "",
        risk: "",
        specialistId
      },
      request: jobContext
    });
  }
}

function shortAddress(address: string) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
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

function draftsFromDelivery(delivery: SpecialistDelivery) {
  return deliveryBlocksFrom(delivery).reduce<Record<string, string>>(
    (drafts, block) => {
      drafts[block.id] = block.text;
      return drafts;
    },
    {}
  );
}

function deliveryBlocksFrom(delivery: SpecialistDelivery): DeliveryAssetBlock[] {
  return delivery.sections.flatMap((section) =>
    section.blocks.map((block) => ({
      id: block.id,
      kind: block.kind,
      label: block.label,
      section: section.title,
      text: block.text
    }))
  );
}

function websiteNotProvided(): WebsiteAnalysis {
  return {
    audience: "",
    ctas: [],
    error: "Website URL was not provided.",
    h1: "",
    h2s: [],
    languageSignals: [],
    mainText: "",
    metaDescription: "",
    ok: false,
    primaryCta: "",
    promise: "",
    recommendation:
      "Review the landing page manually before increasing campaign spend.",
    title: "",
    url: ""
  };
}

function analyticsNotConnected(): GoogleAnalyticsMetrics {
  return {
    connected: false,
    summary: "Analytics not connected",
    topPages: [],
    topSources: []
  };
}

function analyticsUnavailable(message: string): GoogleAnalyticsMetrics {
  return {
    connected: false,
    error: message,
    summary: message,
    topPages: [],
    topSources: []
  };
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
