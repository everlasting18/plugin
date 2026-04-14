import type PocketBase from "pocketbase";
import { createPocketBaseClient, syncPocketBaseCookie } from "./pocketbase.ts";
import type { RuntimeConfig } from "./runtime.ts";

type UsageData = {
  count: number;
  limit: number;
  remaining: number;
  available: boolean;
};

type SiteStatusData = {
  tier: "free" | "pro";
  isPro: boolean;
  licenseValid: boolean;
  expires: number | null;
  message: string;
  usage: UsageData | null;
};

type DomainRecord = {
  id: string;
  domain: string;
  tier: "free" | "pro";
  license_key?: string;
  is_active?: boolean;
  _status?: SiteStatusData | null;
};

function syncAuthCookie(pb: PocketBase): void {
  syncPocketBaseCookie(pb);
}

function normalizeDomain(input: string): string {
  const url = new URL(input);
  return url.origin;
}

function createEmptyState(message: string): HTMLDivElement {
  const wrapper = document.createElement("div");
  wrapper.className = "empty-state";

  const icon = document.createElement("div");
  icon.innerHTML = `
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
      <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `;

  const text = document.createElement("p");
  text.textContent = message;

  const iconNode = icon.firstElementChild;
  if (iconNode) {
    wrapper.append(iconNode, text);
  } else {
    wrapper.append(text);
  }

  return wrapper;
}

export function initDashboard(config: RuntimeConfig): void {
  const pb = createPocketBaseClient(config.pbUrl);

  const userStatusEl = document.getElementById("userStatus");
  const domainListEl = document.getElementById("domainList");
  const tierBadge = document.getElementById("tierBadge");
  const formMessage = document.getElementById("formMessage");
  const addDomainForm = document.getElementById("addDomainForm") as HTMLFormElement | null;
  const addDomainBtn = document.getElementById("addDomainBtn") as HTMLButtonElement | null;
  const totalUsageCount = document.getElementById("totalUsageCount");
  const usageLabel = document.getElementById("usageLabel");
  const usageBarFill = document.getElementById("usageBarFill") as HTMLDivElement | null;
  const usageRemaining = document.getElementById("usageRemaining");
  const usageMonth = document.getElementById("usageMonth");
  const upgradePrompt = document.getElementById("upgradePrompt") as HTMLDivElement | null;

  if (
    !userStatusEl ||
    !domainListEl ||
    !tierBadge ||
    !formMessage ||
    !addDomainForm ||
    !addDomainBtn ||
    !totalUsageCount ||
    !usageLabel ||
    !usageBarFill ||
    !usageRemaining ||
    !usageMonth ||
    !upgradePrompt
  ) {
    return;
  }

  let currentDomains: DomainRecord[] = [];
  let selectedDomainId: string | null = null;

  usageMonth.textContent = new Date().toLocaleDateString("vi-VN", { month: "long", year: "numeric" });

  function getSelectedDomain(domains: DomainRecord[] = currentDomains): DomainRecord | null {
    return domains.find((item) => item.id === selectedDomainId) ||
      domains.find((item) => item.is_active) ||
      domains[0] ||
      null;
  }

  function resetUsageOverview(): void {
    totalUsageCount.textContent = "--";
    usageLabel.textContent = "website đang chọn";
    usageRemaining.textContent = "-- / -- còn lại";
    usageBarFill.style.width = "0%";
    upgradePrompt.style.display = "none";
  }

  async function fetchSiteStatus(domain: string, key = ""): Promise<SiteStatusData> {
    try {
      const res = await fetch(`${config.apiUrl}/license/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, key }),
      });

      if (!res.ok) {
        return {
          tier: "free",
          isPro: false,
          licenseValid: false,
          expires: null,
          message: "Không đồng bộ được trạng thái",
          usage: { count: 0, limit: 5, remaining: 5, available: false },
        };
      }

      const data = await res.json();
      return {
        tier: data.tier === "pro" ? "pro" : "free",
        isPro: data.isPro === true,
        licenseValid: data.licenseValid === true,
        expires: typeof data.expires === "number" ? data.expires : null,
        message: data.message || "",
        usage: data.usage
          ? {
            count: Number(data.usage.count) || 0,
            limit: Number(data.usage.limit) || 5,
            remaining: Number(data.usage.remaining) || 0,
            available: data.usage.allowed !== false,
          }
          : null,
      };
    } catch {
      return {
        tier: "free",
        isPro: false,
        licenseValid: false,
        expires: null,
        message: "Không đồng bộ được trạng thái",
        usage: { count: 0, limit: 5, remaining: 5, available: false },
      };
    }
  }

  async function deleteDomainRecord(id: string, domain: string): Promise<void> {
    if (!confirm(`Xóa website "${domain}" khỏi tài khoản?`)) return;

    try {
      await pb.collection("user_domains").delete(id);
      showMessage("Đã xóa website.", "success");
      await loadDomains();
    } catch (err) {
      console.error("Failed to delete domain:", err);
      showMessage("Không thể xóa website. Thử lại.", "error");
    }
  }

  function createDomainItem(item: DomainRecord): HTMLDivElement {
    const status = item._status;
    const effectiveTier = status?.isPro ? "pro" : "free";

    const row = document.createElement("div");
    const isSelected = item.id === selectedDomainId;
    row.className = `domain-item ${isSelected ? "active" : ""}`;
    row.dataset.id = item.id;
    row.dataset.domain = item.domain;
    row.addEventListener("click", () => {
      selectedDomainId = item.id;
      renderDomainList();
      void updateUsageOverview();
    });

    const info = document.createElement("div");
    info.className = "domain-info";

    const icon = document.createElement("div");
    icon.className = "domain-icon";
    icon.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="#6366f1" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `;

    const details = document.createElement("div");
    details.className = "domain-details";
    const title = document.createElement("h4");
    title.textContent = item.domain;
    const subtitle = document.createElement("span");
    if (item.license_key && status?.licenseValid === false) {
      subtitle.textContent = status.message || "License không hợp lệ";
    } else {
      subtitle.textContent = item.license_key || "Free tier";
    }
    details.append(title, subtitle);

    info.append(icon, details);

    const actions = document.createElement("div");
    actions.className = "domain-actions";

    const usage = document.createElement("span");
    usage.className = "domain-usage";
    if (status?.isPro) {
      usage.textContent = "∞ bài (Pro)";
    } else if (status?.usage?.available) {
      usage.textContent = `Còn ${status.usage.remaining} / ${status.usage.limit} bài`;
    } else {
      usage.textContent = "Chưa đồng bộ quota";
    }

    const badge = document.createElement("span");
    badge.className = `badge badge-${effectiveTier === "pro" ? "pro" : "free"}`;
    badge.textContent = effectiveTier === "pro" ? "Pro" : "Free";

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.title = "Xóa domain";
    deleteBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `;
    deleteBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      void deleteDomainRecord(item.id, item.domain);
    });

    actions.append(usage, badge, deleteBtn);
    row.append(info, actions);
    return row;
  }

  function renderDomainList(): void {
    domainListEl.replaceChildren();

    if (currentDomains.length === 0) {
      domainListEl.appendChild(createEmptyState("Chưa có website nào. Thêm website bên dưới để bắt đầu."));
      tierBadge.style.display = "none";
      resetUsageOverview();
      return;
    }

    const selected = getSelectedDomain();
    if (selected) {
      selectedDomainId = selected.id;
    }

    currentDomains.forEach((item) => {
      domainListEl.appendChild(createDomainItem(item));
    });

    const hasPro = currentDomains.some((item) => item._status?.isPro);
    tierBadge.style.display = "inline-flex";
    tierBadge.textContent = hasPro ? "Pro" : "Free";
    tierBadge.className = `badge badge-${hasPro ? "pro" : "free"}`;
  }

  function renderUserInfo(): void {
    if (pb.authStore.isValid) {
      syncAuthCookie(pb);
      const user = pb.authStore.record;
      userStatusEl.textContent = user?.email || "Đã đăng nhập Google";
    } else {
      userStatusEl.textContent = "Chưa đăng nhập — ";
      const link = document.createElement("a");
      link.href = "/login";
      link.textContent = "Đăng nhập";
      link.style.color = "#6366f1";
      link.style.textDecoration = "underline";
      userStatusEl.appendChild(link);
    }
  }

  async function loadDomains(): Promise<void> {
    if (!pb.authStore.isValid) {
      currentDomains = [];
      selectedDomainId = null;
      domainListEl.replaceChildren(createEmptyState("Vui lòng đăng nhập để quản lý website."));
      tierBadge.style.display = "none";
      resetUsageOverview();
      return;
    }

    try {
      const result = await pb.collection("user_domains").getList(1, 50, {
        filter: `user = "${pb.authStore.record?.id}"`,
        sort: "-created",
      });

      currentDomains = await Promise.all(result.items.map(async (item: unknown) => {
        const domainItem = item as DomainRecord;
        return {
          ...domainItem,
          _status: await fetchSiteStatus(domainItem.domain, domainItem.license_key || ""),
        };
      }));
      selectedDomainId = getSelectedDomain(currentDomains)?.id || null;
      renderDomainList();
      await updateUsageOverview();
    } catch (err) {
      console.error("Failed to load domains:", err);
      currentDomains = [];
      selectedDomainId = null;
      domainListEl.replaceChildren(createEmptyState("Không thể tải danh sách website. Thử lại sau."));
      tierBadge.style.display = "none";
      resetUsageOverview();
    }
  }

  async function updateUsageOverview(): Promise<void> {
    const selected = getSelectedDomain();
    if (!selected) {
      resetUsageOverview();
      return;
    }

    usageLabel.textContent = selected.domain;

    const status = selected._status || await fetchSiteStatus(selected.domain, selected.license_key || "");
    selected._status = status;

    if (status.isPro) {
      totalUsageCount.textContent = "∞";
      usageRemaining.textContent = "Unlimited";
      usageBarFill.style.width = "0%";
      upgradePrompt.style.display = "none";
      return;
    }

    const usage = status.usage;

    if (!usage?.available) {
      totalUsageCount.textContent = "--";
      usageRemaining.textContent = status.message || "Chưa đồng bộ quota";
      usageBarFill.style.width = "0%";
      upgradePrompt.style.display = "none";
      renderDomainList();
      return;
    }

    totalUsageCount.textContent = String(usage.count);
    usageRemaining.textContent = `${usage.remaining} / ${usage.limit} còn lại`;
    const pct = usage.limit > 0 ? (usage.count / usage.limit) * 100 : 0;
    usageBarFill.style.width = `${Math.min(100, pct)}%`;
    upgradePrompt.style.display = usage.remaining <= 0 ? "block" : "none";
    renderDomainList();
  }

  function showMessage(message: string, type: "success" | "error"): void {
    formMessage.textContent = message;
    formMessage.className = `alert alert-${type}`;
    formMessage.style.display = "block";
    setTimeout(() => {
      formMessage.style.display = "none";
    }, 5000);
  }

  addDomainForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!pb.authStore.isValid) {
      showMessage("Vui lòng đăng nhập trước.", "error");
      return;
    }

    const domainInput = document.getElementById("newDomain") as HTMLInputElement | null;
    const licenseInput = document.getElementById("newLicenseKey") as HTMLInputElement | null;
    const domain = domainInput?.value.trim() || "";
    const licenseKey = licenseInput?.value.trim() || "";

    if (!domain) {
      showMessage("Vui lòng nhập domain website.", "error");
      return;
    }

    let normalizedDomain = "";
    try {
      const url = new URL(domain);
      if (!url.protocol.startsWith("http")) {
        showMessage("Domain phải có http:// hoặc https://", "error");
        return;
      }
      normalizedDomain = normalizeDomain(domain);
    } catch {
      showMessage("Domain không hợp lệ.", "error");
      return;
    }

    if (currentDomains.some((item) => item.domain === normalizedDomain)) {
      showMessage("Website này đã có trong tài khoản.", "error");
      return;
    }

    addDomainBtn.disabled = true;
    addDomainBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" class="spin">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="white" stroke-width="2" stroke-linecap="round"/>
      </svg>
      Đang xử lý...`;

    try {
      let tier: "free" | "pro" = "free";
      let activatedKey = "";

      if (licenseKey) {
        const res = await fetch(`${config.apiUrl}/license/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: licenseKey, site_url: normalizedDomain }),
        });
        const data = await res.json();
        if (!data.valid) {
          showMessage(data.message || "License key không hợp lệ.", "error");
          addDomainBtn.disabled = false;
          addDomainBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="white" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Thêm website`;
          return;
        }
        tier = data.tier;
        activatedKey = licenseKey;
      }

      await pb.collection("user_domains").create({
        user: pb.authStore.record?.id,
        domain: normalizedDomain,
        tier,
        license_key: activatedKey,
        is_active: currentDomains.length === 0,
      });

      if (domainInput) domainInput.value = "";
      if (licenseInput) licenseInput.value = "";

      showMessage(
        tier === "pro"
          ? `Kích hoạt Pro thành công! License: ${activatedKey}`
          : "Đã thêm website Free thành công.",
        "success",
      );

      await loadDomains();
    } catch (err) {
      console.error("Failed to add domain:", err);
      showMessage("Có lỗi xảy ra. Vui lòng thử lại.", "error");
    } finally {
      addDomainBtn.disabled = false;
      addDomainBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="white" stroke-width="2" stroke-linecap="round"/>
        </svg>
        Thêm website`;
    }
  });

  renderUserInfo();
  pb.authStore.onChange(() => {
    renderUserInfo();
    void loadDomains();
  });

  void loadDomains();
}
