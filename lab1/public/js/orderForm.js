let productIndex = 1;

function addProductField() {
    const productsDiv = document.querySelector("#productFields");
    const newProductDiv = document.createElement('div');
    newProductDiv.classList.add('form-group', 'product-group');

    // Create a deep copy of the first product select field
    const firstProductSelect = document.querySelector('select[name="items[0][product]"]');
    const newProductSelect = firstProductSelect.cloneNode(true);
    newProductSelect.name = `items[${productIndex}][product]`;

    // Create a new quantity input field
    const newQuantityInput = document.createElement('input');
    newQuantityInput.type = "number";
    newQuantityInput.name = `items[${productIndex}][quantity]`;
    newQuantityInput.min = "1";
    newQuantityInput.required = true;

    newProductDiv.appendChild(newProductSelect);
    newProductDiv.appendChild(newQuantityInput);

    productsDiv.appendChild(newProductDiv);

    productIndex++;
}

function removeProductField() {
    const productGroups = document.querySelectorAll('.product-group');
    if (productGroups.length > 1) {
        productGroups[productGroups.length - 1].remove();
        productIndex--;
    }
}
