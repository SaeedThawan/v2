const GOOGLE_SHEETS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwCcLyaijiyEeZrRpv2Vpn0cMSCTHLbljg5KXmBNeE92JvkQ0rHPGsAb2MUchqn-oTC9A/exec';

let productsData = [];
let salesRepresentatives = [];
let customersMain = [];
let visitOutcomes = [];
let visitPurposes = [];
let visitTypes = [];

const visitForm = document.getElementById('visitForm');
const salesRepNameSelect = document.getElementById('salesRepName');
const customerNameInput = document.getElementById('customerName');
const customerListDatalist = document.getElementById('customerList');
const visitTypeSelect = document.getElementById('visitType');
const visitPurposeSelect = document.getElementById('visitPurpose');
const visitOutcomeSelect = document.getElementById('visitOutcome');
const productCategoriesDiv = document.getElementById('productCategories');
const productsDisplayDiv = document.getElementById('productsDisplay');
const submitBtn = document.getElementById('submitBtn');
const loadingSpinner = document.getElementById('loadingSpinner');

// ✅ SweetAlert بدل showMessageBox
function showSuccessMessage() {
  Swal.fire({
    title: '✅ تم الإرسال!',
    text: 'تم إرسال النموذج بنجاح.',
    icon: 'success',
    confirmButtonText: 'ممتاز'
  });
}

function showErrorMessage(message) {
  Swal.fire({
    title: '❌ فشل الإرسال',
    text: message || 'حدث خطأ أثناء إرسال النموذج. حاول مجددًا.',
    icon: 'error',
    confirmButtonText: 'موافق'
  });
}

function showWarningMessage(message) {
  Swal.fire({
    title: '⚠️ تنبيه',
    text: message,
    icon: 'warning',
    confirmButtonText: 'موافق'
  });
}

function generateVisitID() {
  const timestamp = new Date().getTime();
  const randomString = Math.random().toString(36).substring(2, 8);
  return `VISIT-${timestamp}-${randomString}`;
}

function formatDate(date) {
  return date.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTime(date) {
  return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function formatTimestamp(date) {
  return date.toLocaleString('ar-SA', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

async function fetchJsonData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`خطأ في تحميل ${url}:`, error);
    showErrorMessage(`فشل تحميل البيانات من ${url}`);
    return [];
  }
}

async function loadAllData() {
  [
    productsData,
    salesRepresentatives,
    customersMain,
    visitOutcomes,
    visitPurposes,
    visitTypes
  ] = await Promise.all([
    fetchJsonData('products.json'),
    fetchJsonData('sales_representatives.json'),
    fetchJsonData('customers_main.json'),
    fetchJsonData('visit_outcomes.json'),
    fetchJsonData('visit_purposes.json'),
    fetchJsonData('visit_types.json')
  ]);
  populateSelect(salesRepNameSelect, salesRepresentatives, 'Sales_Rep_Name_AR', 'Sales_Rep_Name_AR');
  populateCustomerDatalist();
  populateSelect(visitTypeSelect, visitTypes, 'Visit_Type_Name_AR', 'Visit_Type_Name_AR');
  populateSelect(visitPurposeSelect, visitPurposes);
  populateSelect(visitOutcomeSelect, visitOutcomes);
  setupProductCategories();
}

function populateSelect(selectElement, dataArray, valueKey, textKey) {
  while (selectElement.children.length > 1) selectElement.removeChild(selectElement.lastChild);
  dataArray.forEach(item => {
    const option = document.createElement('option');
    if (typeof item === 'object') {
      option.value = item[valueKey];
      option.textContent = item[textKey];
    } else {
      option.value = item;
      option.textContent = item;
    }
    selectElement.appendChild(option);
  });
}

function populateCustomerDatalist() {
  customerListDatalist.innerHTML = '';
  customersMain.forEach(customer => {
    const option = document.createElement('option');
    option.value = customer.Customer_Name_AR;
    customerListDatalist.appendChild(option);
  });
}

let productCategories = {};
function setupProductCategories() {
  productCategoriesDiv.innerHTML = '';
  productCategories = {};
  productsData.forEach(product => {
    if (!productCategories[product.Category]) productCategories[product.Category] = [];
    productCategories[product.Category].push(product);
  });

  for (const category in productCategories) {
    const div = document.createElement('div');
    div.className = 'flex items-center';
    div.innerHTML = `
      <input type="checkbox" id="cat-${category.replace(/\s/g, '-')}" value="${category}" class="h-5 w-5 text-indigo-600 border-gray-300 rounded cursor-pointer">
      <label for="cat-${category.replace(/\s/g, '-')}" class="ml-2 text-sm font-medium text-gray-700">${category}</label>
    `;
    productCategoriesDiv.appendChild(div);
    div.querySelector('input').addEventListener('change', e => toggleProductsDisplay(e.target.value, e.target.checked));
  }
}

function toggleProductsDisplay(category, isChecked) {
  const categoryProducts = productCategories[category];
  if (!categoryProducts) return;

  if (isChecked) {
    categoryProducts.forEach(product => {
      const safeName = product.Product_Name_AR.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '');
      const productId = `product-${safeName}-${Math.random().toString(36).substring(2, 6)}`;
      const productDiv = document.createElement('div');
      productDiv.id = productId;
      productDiv.className = 'product-item';
      productDiv.setAttribute('data-category', category);
      productDiv.innerHTML = `
        <label>${product.Product_Name_AR}</label>
        <div class="radio-group">
          <label><input type="radio" name="status-${productId}" value="متوفر" required> متوفر</label>
          <label><input type="radio" name="status-${productId}" value="غير متوفر" required> غير متوفر</label>
        </div>
      `;
      productsDisplayDiv.appendChild(productDiv);
    });
  } else {
    const toRemove = productsDisplayDiv.querySelectorAll(`[data-category="${category}"]`);
    toRemove.forEach(div => div.remove());
  }
}

function validateProductStatuses() {
  const items = productsDisplayDiv.querySelectorAll('.product-item');
  if (items.length === 0) return true;

  let allValid = true;
  items.forEach(div => {
    const radios = div.querySelectorAll('input[type="radio"]');
    const checked = [...radios].some(r => r.checked);
    if (!checked) {
      allValid = false;
      div.style.border = '2px solid red';
      div.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => (div.style.border = ''), 3000);
    }
  });

  if (!allValid) {
    showWarningMessage('يرجى تحديد حالة التوفر لكل المنتجات الظاهرة.');
  }

  return allValid;
}

async function handleSubmit(event) {
  event.preventDefault();
  if (!visitForm.checkValidity()) {
    visitForm.reportValidity();
    showWarningMessage('يرجى تعبئة جميع الحقول المطلوبة.');
    return;
  }

  if (!validateProductStatuses()) return;

  submitBtn.disabled = true;
  loadingSpinner.classList.remove('hidden');

  const formData = new FormData(visitForm);
  const now = new Date();

  // الحصول على اسم العميل المختار من النموذج
  const selectedCustomerName = formData.get('Customer_Name_AR');
  // البحث عن كائن العميل في مصفوفة customersMain للحصول على Customer_Code
  const customer = customersMain.find(c => c.Customer_Name_AR === selectedCustomerName);
  // استخراج الكود، أو تعيينه إلى سلسلة فارغة إذا لم يتم العثور عليه
  const customerCode = customer ? customer.Customer_Code : '';

  const dataToSubmit = {
    Visit_ID: generateVisitID(),
    Customer_Code: customerCode, // 👈 تم إضافة هذا الحقل
    Customer_Name_AR: selectedCustomerName,
    Sales_Rep_Name_AR: formData.get('Sales_Rep_Name_AR'),
    Visit_Date: formatDate(now),
    Visit_Time: formatTime(now),
    Visit_Purpose: formData.get('Visit_Purpose'),
    Visit_Outcome: formData.get('Visit_Outcome'),
    Visit_Type_Name_AR: formData.get('Visit_Type_Name_AR'),
    Entry_User_Name: formData.get('Entry_User_Name'),
    Timestamp: formatTimestamp(now),
    Customer_Type: formData.get('Customer_Type'),
    Notes: formData.get('Notes') || ''
  };

  const available = [], unavailable = [];
  const items = productsDisplayDiv.querySelectorAll('.product-item');
  items.forEach(div => {
    const name = div.querySelector('label').textContent;
    const selected = div.querySelector('input[type="radio"]:checked');
    if (selected) {
      selected.value === 'متوفر' ? available.push(name) : unavailable.push(name);
    }
  });

  dataToSubmit.Available_Products_Names = available.join(', ');
  dataToSubmit.Unavailable_Products_Names = unavailable.join(', ');

  try {
    const response = await fetch(GOOGLE_SHEETS_WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dataToSubmit),
    });

    showSuccessMessage();
    visitForm.reset();
    productsDisplayDiv.innerHTML = '';
    document.querySelectorAll('input[name="productCategory"]:checked').forEach(c => c.checked = false);

  } catch (error) {
    console.error('فشل الإرسال:', error);
    showErrorMessage('حدث خطأ أثناء إرسال البيانات. حاول مرة أخرى.');
  } finally {
    submitBtn.disabled = false;
    loadingSpinner.classList.add('hidden');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadAllData();
  visitForm.addEventListener('submit', handleSubmit);
});
