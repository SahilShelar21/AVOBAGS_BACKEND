module.exports = function orderEmail(order, items) {
  return `
    <h2>Thank you for your order!</h2>
    <p><b>Order ID:</b> ${order.id}</p>

    <h3>Shipping Details</h3>
    <p>
      ${order.name}<br/>
      ${order.address}<br/>
      ${order.city} - ${order.pincode}<br/>
      Phone: ${order.phone}
    </p>

    <h3>Order Summary</h3>
    <ul>
      ${items
        .map(
          i =>
            `<li>${i.name} × ${i.quantity} — ₹${i.price * i.quantity}</li>`
        )
        .join("")}
    </ul>

    <h3>Total: ₹${order.total_amount}</h3>
    <p>Payment Method: ${order.payment_method.toUpperCase()}</p>
  `;
};
