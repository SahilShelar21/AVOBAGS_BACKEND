module.exports = function whatsappMessage(order) {
  return `
*🛍️ NEW ORDER RECEIVED*

*Order ID:* ${order.orderId}

*Customer:* ${order.customer.name}
*Phone:* ${order.customer.phone}
*Address:* ${order.customer.address}, ${order.customer.city}

*Items:*
${order.items.map(i => `- ${i.name} x${i.quantity}`).join("\n")}

*Total:* ₹${order.totalAmount}
*Payment:* ${order.paymentMethod.toUpperCase()}
`;
};
