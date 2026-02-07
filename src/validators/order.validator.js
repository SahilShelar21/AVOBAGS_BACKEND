const { z } = require('zod');

exports.createOrderSchema = z.object({
  items: z.array(
    z.object({
      product_id: z.number().int().positive(),
      quantity: z.number().int().positive(),
      price: z.number().positive()
    })
  ).min(1),

  totalAmount: z.number().positive()
});
