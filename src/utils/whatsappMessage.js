module.exports = function whatsappMessage(order, items) {
  return `
*🛍️ NEW ORDER RECEIVED*

*Order ID:* ${order.id}

*Customer:* ${order.name}
*Phone:* ${order.phone}
*Address:* ${order.address}, ${order.city}

*Items:*
${items.map(i => `- ${i.name} x${i.quantity}`).join("\n")}

*Total:* ₹${order.total_amount}
*Payment:* ${order.payment_method.toUpperCase()}
`;
};
