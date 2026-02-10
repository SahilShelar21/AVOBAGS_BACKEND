// src/utils/whatsappMessage.js
module.exports = function whatsappMessage(order) {
  return `
🛍️ *NEW AVOBAGS ORDER*

🆔 *Order ID:* ${order.id}

👤 *Customer:* ${order.shipping_name}
📞 *Phone:* ${order.shipping_phone}
📍 *Address:* ${order.shipping_address}, ${order.shipping_city}

📦 *Items:*
${order.items
  .map((i) => `• ${i.product_name} × ${i.quantity}`)
  .join("\n")}

💰 *Total:* ₹${order.total_amount}
💳 *Payment:* ${order.payment_method.toUpperCase()}
`;
};
