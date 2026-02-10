// src/utils/orderEmailTemplate.js
module.exports = function orderEmail(order) {
  return `
    <h2>🛍️ New Order Received – AVOBAGS</h2>

    <p><b>Order ID:</b> ${order.id}</p>

    <h3>🚚 Shipping Details</h3>
    <p>
      ${order.shipping_name}<br/>
      ${order.shipping_address}<br/>
      ${order.shipping_city} - ${order.shipping_pincode}<br/>
      Phone: ${order.shipping_phone}
    </p>

    <h3>🧾 Order Summary</h3>
    <ul>
      ${order.items
        .map(
          (i) =>
            `<li>${i.product_name} × ${i.quantity} — ₹${
              i.price * i.quantity
            }</li>`
        )
        .join("")}
    </ul>

    <h3>Total Amount: ₹${order.total_amount}</h3>

    <p>
      <b>Payment Method:</b> ${order.payment_method.toUpperCase()}<br/>
      <b>Payment Status:</b> ${order.payment_status}
    </p>

    <hr/>
    <p>AVOBAGS – Premium Travel Bags</p>
  `;
};
