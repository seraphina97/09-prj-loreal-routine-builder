/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsList = document.getElementById("selectedProductsList");

/* Get reference to the Generate Routine button */
const generateRoutineBtn = document.getElementById("generateRoutine");

/* Get reference to the search input */
const productSearch = document.getElementById("productSearch");

/* Store selected products in an array */
let selectedProducts = [];

/* Store all loaded products for filtering */
let allProducts = [];

/* Helper: Save selected products to localStorage */
function saveSelectedProducts() {
  localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));
}

/* Helper: Load selected products from localStorage */
function loadSelectedProducts() {
  const saved = localStorage.getItem("selectedProducts");
  if (saved) {
    try {
      selectedProducts = JSON.parse(saved);
    } catch {
      selectedProducts = [];
    }
  }
}

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  // Use product name as unique identifier for selection
  productsContainer.innerHTML = products
    .map((product) => {
      // Check if product is selected
      const isSelected = selectedProducts.some((p) => p.name === product.name);
      // Add a class if selected
      return `
    <div class="product-card${
      isSelected ? " selected" : ""
    }" data-product-name="${product.name}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
        <p>${product.description}</p>
      </div>
    </div>
  `;
    })
    .join("");

  // Add click event listeners to product cards
  const productCards = productsContainer.querySelectorAll(".product-card");
  productCards.forEach((card) => {
    card.addEventListener("click", () => {
      const productName = card.getAttribute("data-product-name");
      const product = products.find((p) => p.name === productName);

      // Check if already selected
      const index = selectedProducts.findIndex((p) => p.name === productName);
      if (index === -1) {
        // Add to selected
        selectedProducts.push(product);
      } else {
        // Remove from selected
        selectedProducts.splice(index, 1);
      }
      // Update UI
      displayProducts(products);
      updateSelectedProductsList();
      saveSelectedProducts(); // Save after selection change
    });
  });
}

/* Update the Selected Products section */
function updateSelectedProductsList() {
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = `<div class="placeholder-message">No products selected.</div>`;
    // Remove Clear All button if present
    const clearBtn = document.getElementById("clearAllBtn");
    if (clearBtn) clearBtn.remove();
    return;
  }
  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product, idx) => `
    <div class="selected-product-item">
      <span>${product.name}</span>
      <button class="remove-btn" data-index="${idx}" title="Remove">
        &times;
      </button>
    </div>
  `
    )
    .join("");

  // Add Clear All button if not present
  if (!document.getElementById("clearAllBtn")) {
    const clearBtn = document.createElement("button");
    clearBtn.id = "clearAllBtn";
    clearBtn.textContent = "Clear All";
    clearBtn.className = "generate-btn";
    clearBtn.style.marginTop = "10px";
    clearBtn.onclick = () => {
      selectedProducts = [];
      saveSelectedProducts();
      updateSelectedProductsList();
      // Optionally refresh product grid to remove highlights
      const selectedCategory = categoryFilter.value;
      if (selectedCategory) {
        loadProducts().then((products) => {
          const filteredProducts = products.filter(
            (product) => product.category === selectedCategory
          );
          displayProducts(filteredProducts);
        });
      }
    };
    selectedProductsList.parentNode.appendChild(clearBtn);
  }

  // Add event listeners to remove buttons
  const removeBtns = selectedProductsList.querySelectorAll(".remove-btn");
  removeBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idx = parseInt(btn.getAttribute("data-index"));
      selectedProducts.splice(idx, 1);
      saveSelectedProducts();
      // Refresh both product grid and selected list
      const selectedCategory = categoryFilter.value;
      if (selectedCategory) {
        loadProducts().then((products) => {
          const filteredProducts = products.filter(
            (product) => product.category === selectedCategory
          );
          displayProducts(filteredProducts);
        });
      }
      updateSelectedProductsList();
    });
  });
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
});

/* Helper: Filter products by category and search term */
function getFilteredProducts() {
  // Get current category and search value
  const selectedCategory = categoryFilter.value;
  const searchValue = productSearch.value.trim().toLowerCase();

  // Start with all products
  let filtered = allProducts;

  // Filter by category if selected
  if (selectedCategory) {
    filtered = filtered.filter(
      (product) => product.category === selectedCategory
    );
  }

  // Filter by search term if entered
  if (searchValue) {
    filtered = filtered.filter((product) => {
      // Search in name, brand, and description
      return (
        product.name.toLowerCase().includes(searchValue) ||
        product.brand.toLowerCase().includes(searchValue) ||
        product.description.toLowerCase().includes(searchValue)
      );
    });
  }

  return filtered;
}

/* Update the product grid based on filters */
function updateProductGrid() {
  const filteredProducts = getFilteredProducts();
  displayProducts(filteredProducts);
}

/* Load all products on page load */
async function initProducts() {
  allProducts = await loadProducts();
  updateProductGrid();
}

/* Listen for changes in category filter */
categoryFilter.addEventListener("change", () => {
  updateProductGrid();
});

/* Listen for input in search field */
productSearch.addEventListener("input", () => {
  updateProductGrid();
});

/* Store the chat conversation history */
let chatHistory = [
  {
    role: "system",
    content:
      "You are a helpful assistant for beauty routines. Only answer questions about skincare, haircare, makeup, fragrance, or the user's generated routine. If a question is off-topic, politely say you can only answer beauty-related questions.",
  },
];

/* Handle Generate Routine button click */
generateRoutineBtn.addEventListener("click", async () => {
  // If no products selected, show a message
  if (selectedProducts.length === 0) {
    chatWindow.innerHTML =
      "Please select products before generating a routine.";
    return;
  }

  // Prepare data to send to OpenAI (only include basic info)
  const productData = selectedProducts.map((product) => ({
    name: product.name,
    brand: product.brand,
    category: product.category,
    description: product.description,
  }));

  // Show loading message
  chatWindow.innerHTML = "Generating your routine...";

  // Build the prompt for the AI
  const prompt = `
You are a beauty routine expert. Given these products, create a simple, step-by-step routine using them. 
List each step and explain briefly why each product is used.

Products:
${productData
  .map(
    (p, i) =>
      `${i + 1}. ${p.name} (${p.brand}) - ${p.category}: ${p.description}`
  )
  .join("\n")}
`;

  // Add the user's request to the chat history
  chatHistory = [
    chatHistory[0], // system prompt
    { role: "user", content: prompt },
  ];

  try {
    // Call OpenAI API using fetch and async/await
    const response = await fetch(
      "https://loreal-prj8.drewlynntaylor.workers.dev/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: chatHistory,
          max_tokens: 400,
          temperature: 0.7,
        }),
      }
    );

    const data = await response.json();

    // Get the AI's reply
    const aiMessage =
      data.choices && data.choices[0] && data.choices[0].message.content
        ? data.choices[0].message.content
        : "Sorry, I couldn't generate a routine. Please try again.";

    // Add AI's reply to chat history
    chatHistory.push({ role: "assistant", content: aiMessage });

    // Display the routine in the chat window
    chatWindow.innerHTML = `<div class="ai-message">${aiMessage.replace(
      /\n/g,
      "<br>"
    )}</div>`;
  } catch (error) {
    chatWindow.innerHTML =
      "There was an error generating your routine. Please check your API key and try again.";
  }
});

/* Chat form submission handler - now supports follow-up questions */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userInput = document.getElementById("userInput").value.trim();
  if (!userInput) return;

  // Add user's question to chat history
  chatHistory.push({ role: "user", content: userInput });

  // Show user's message and loading message
  chatWindow.innerHTML += `<div class="user-message">${userInput}</div>`;
  chatWindow.innerHTML += `<div class="ai-message">Thinking...</div>`;

  // Scroll to bottom
  chatWindow.scrollTop = chatWindow.scrollHeight;

  try {
    // Call OpenAI API with full chat history
    const response = await fetch(
      "https://loreal-prj8.drewlynntaylor.workers.dev/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: chatHistory,
          max_tokens: 400,
          temperature: 0.7,
        }),
      }
    );

    const data = await response.json();

    // Get the AI's reply
    const aiMessage =
      data.choices && data.choices[0] && data.choices[0].message.content
        ? data.choices[0].message.content
        : "Sorry, I couldn't answer that. Please try again.";

    // Add AI's reply to chat history
    chatHistory.push({ role: "assistant", content: aiMessage });

    // Display the full chat history (user and AI messages)
    chatWindow.innerHTML = "";
    for (let i = 1; i < chatHistory.length; i++) {
      if (chatHistory[i].role === "user") {
        chatWindow.innerHTML += `<div class="user-message">${chatHistory[i].content}</div>`;
      } else if (chatHistory[i].role === "assistant") {
        chatWindow.innerHTML += `<div class="ai-message">${chatHistory[
          i
        ].content.replace(/\n/g, "<br>")}</div>`;
      }
    }
    chatWindow.scrollTop = chatWindow.scrollHeight;
  } catch (error) {
    chatWindow.innerHTML +=
      "<div class='ai-message'>There was an error. Please try again.</div>";
  }

  // Clear input box
  document.getElementById("userInput").value = "";
});

/* On page load, restore selected products and load products */
loadSelectedProducts();
updateSelectedProductsList();
initProducts();
