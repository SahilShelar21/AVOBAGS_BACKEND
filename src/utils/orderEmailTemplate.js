module.exports = function orderEmail(order) {
  return `
    <h2>Thank you for your order!</h2>
    <p>Order ID: <b>${order.orderId}</b></p>

    <h3>Shipping Details</h3>
    <p>
      ${order.customer.name}<br/>
      ${order.customer.address}<br/>
      ${order.customer.city} - ${order.customer.pincode}<br/>
      Phone: ${order.customer.phone}
    </p>

    <h3>Order Summary</h3>
    <ul>
      ${order.items
        .map(
          (i) =>
            `<li>${i.name} × ${i.quantity} — ₹${i.price * i.quantity}</li>`
        )
        .join("")}
    </ul>

    <h3>Total: ₹${order.totalAmount}</h3>

    <p>Payment Method: ${order.paymentMethod.toUpperCase()}</p>
  `;
};
