const modalOverlay = document.getElementById("modalOverlay");
const modalTitle = document.getElementById("modalTitle")
const confirmationMsg = document.getElementById("confirmation-msg")
const confirmYes = document.getElementById("confirmYes");
const confirmNo = document.getElementById("confirmNo");
const recentList = document.getElementById("recentList");
const loadingOverlay = document.getElementById("loadingOverlay");
const RECENT_STORAGE_KEY = "recentlyPurchasedItems";

let currentCard = null;
const baseUrl = `https://script.google.com/macros/s/AKfycbyBG4ROOZ6M28fILsq9f0i3f_9wRtv5zOGLFF4DwcUhp_Qu4pEnC5KGFAoc2SstDcRYUA/exec`;

// Show loading spinner
function showLoading() {
  loadingOverlay.classList.add("active");
}

// Hide loading spinner
function hideLoading() {
  loadingOverlay.classList.remove("active");
}

async function fetchItems(showLoad) {
  if (showLoad === true){
      showLoading();
  } else {
      hideLoading();
  }
  
  try {
    const res = await fetch(baseUrl);
    const data = await res.json();
    return data.items || [];
  } catch (err) {
    console.error(err);
    alert("Failed to fetch items.");
    return [];
  } finally {
    hideLoading();
  }
}

async function incrementPurchased(itemId) {
  showLoading();
  try {
    const res = await fetch(`${baseUrl}?itemId=${itemId}&action=increment`);
    return await res.json();
  } catch (err) {
    console.error(err);
    alert('Error: ' + err.message);
    return null;
  } finally {
    hideLoading();
  }
}

async function decrementPurchased(itemId) {
  showLoading();
  try {
    const res = await fetch(`${baseUrl}?itemId=${itemId}&action=decrement`);
    return await res.json();
  } catch (err) {
    console.error(err);
    alert('Error: ' + err.message);
    return null;
  } finally {
    hideLoading();
  }
}

function renderItemCard(item) {
  const purchased = Number(item.Purchased);
  const needed = Number(item.Needed);
  const remaining = Math.max(needed - purchased, 0);
  const disabled = purchased >= needed ? "purchased" : "";

  const percent = needed > 0 ? Math.min((purchased / needed) * 100, 100) : 0;

  return `
    <div class="product-card ${disabled}" data-id="${item.ID}">
      <div class="product-image">
        <img src="${item.Image || 'images/placeholder.jpg'}" alt="${item.Name}" />
      </div>
      <button class="buy-button" title="Buy this item" ${disabled ? "disabled" : ""}>Buy</button>
      <div class="product-content">
        <h3 class="product-title">${item.Name}</h3>
        <p class="product-quantity">Need: ${remaining}</p>
        <div class="product-progress" aria-label="Progress for ${item.Name}">
          <div class="product-progress-bar" style="width: ${percent}%"></div>
        </div>
        <a href="${item.Link}" class="shop-button" target="_blank" rel="noopener noreferrer">Shop Now</a>
      </div>
    </div>
  `;
}

async function initialize(showLoad) {
  const grid = document.querySelector(".products-grid");
  grid.innerHTML = "";

  const items = await fetchItems(showLoad);

  if (!items.length) {
    grid.innerHTML = "<p>No items found.</p>";
    return;
  }

  for (const item of items) {
    grid.insertAdjacentHTML("beforeend", renderItemCard(item));
  }

  // Add event listeners on Buy buttons
  grid.querySelectorAll(".buy-button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".product-card");
      currentCard = card;
      openModal();
    });
  });

  renderRecentlyPurchased();
}

function openModal() {
  modalOverlay.style.display = "flex";
  confirmYes.focus();
}

function closeModal() {
  modalOverlay.style.display = "none";
  currentCard = null;
}

confirmNo.addEventListener("click", () => {
  closeModal();
});

confirmYes.addEventListener("click", async () => {
  if (!currentCard) return;

  const itemId = currentCard.dataset.id;

  // Call API to increment purchase
  const result = await incrementPurchased(itemId);
  if (result && result.success) {
    // Mark card purchased if needed is fulfilled
    const purchased = Number(result.purchased);
    const needed = Number(result.needed);
    if (purchased >= needed) {
      currentCard.classList.add("purchased");
      currentCard.querySelector(".buy-button").disabled = true;
    }
    updateCardProgress(currentCard, purchased, needed);
    addToRecentlyPurchased(result.item);
    closeModal();
  } else {
    alert("Failed to mark item as purchased.");
  }
});

// Update the progress bar and quantity text for a card
function updateCardProgress(card, purchased, needed) {
  const remaining = Math.max(needed - purchased, 0);
  card.querySelector(".product-quantity").textContent = `Need: ${remaining}`;
  const percent = needed > 0 ? Math.min((purchased / needed) * 100, 100) : 0;
  card.querySelector(".product-progress-bar").style.width = percent + "%";
}

// Load recently purchased items from localStorage
function getRecentlyPurchased() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

// Save recently purchased items to localStorage
function saveRecentlyPurchased(items) {
  localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(items));
}

function addToRecentlyPurchased(item) {
  if (!item) return;

  let recent = getRecentlyPurchased();

  // Check if already present
  const existingIndex = recent.findIndex((i) => i.ID === item.ID);
  if (existingIndex !== -1) {
    // Increment quantity
    recent[existingIndex].purchased += 1;
  } else {
    recent.unshift({
      ID: item.ID,
      Name: item.Name,
      Image: item.Image,
      purchased: 1,
    });
  }

  // Keep max 5 recent items
  if (recent.length > 5) {
    recent = recent.slice(0, 5);
  }

  saveRecentlyPurchased(recent);
  renderRecentlyPurchased();
}

function renderRecentlyPurchased() {
  const recent = getRecentlyPurchased();
  recentList.innerHTML = "";

  if (recent.length === 0) {
    recentList.innerHTML = "<li>No recent purchases.</li>";
    return;
  }

  for (const item of recent) {
    const li = document.createElement("li");

    const img = document.createElement("img");
    img.src = item.Image || "images/placeholder.jpg";
    img.alt = item.Name;
    li.appendChild(img);

    const span = document.createElement("span");
    span.textContent = `${item.Name} (${item.purchased})`;
    li.appendChild(span);

    const btn = document.createElement("button");
    btn.className = "decrement-btn";
    btn.setAttribute("aria-label", `Decrease quantity of ${item.Name} in recently purchased list`);
    btn.textContent = "−";
    btn.disabled = item.purchased <= 1;

    btn.addEventListener("click", async () => {
      // Decrement purchased count in backend
      const res = await decrementPurchased(item.ID);
      if (res && res.success) {
        item.purchased--;
        if (item.purchased <= 0) {
          const idx = recent.findIndex(i => i.ID === item.ID);
          if (idx !== -1) recent.splice(idx, 1);
        }
        saveRecentlyPurchased(recent);
        renderRecentlyPurchased();
        // Also update main product card
        updateMainCard(item.ID);
      } else {
        alert("Failed to decrement purchased count.");
      }
    });

    li.appendChild(btn);
    recentList.appendChild(li);
  }
}

// Update main product card quantity and progress after decrement
async function updateMainCard(itemId) {
  const grid = document.querySelector(".products-grid");
  const card = grid.querySelector(`.product-card[data-id="${itemId}"]`);
  if (!card) return;

  // Refetch item data for updated purchased count
  const items = await fetchItems(false);
  const item = items.find(i => i.ID === itemId);
  if (!item) return;

  const purchased = Number(item.Purchased);
  const needed = Number(item.Needed);

  updateCardProgress(card, purchased, needed);
  if (purchased < needed) {
    card.classList.remove("purchased");
    card.querySelector(".buy-button").disabled = false;
  } else {
    card.classList.add("purchased");
    card.querySelector(".buy-button").disabled = true;
  }
}

window.addEventListener("DOMContentLoaded", () => initialize(true));
