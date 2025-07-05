const mongoose = require('mongoose');

const DeletedGoodsSchema = new mongoose.Schema({
  originalGoodId: { type: mongoose.Schema.Types.ObjectId, required: true },
  data: { type: Object, required: true },  // store the entire good document here
  deletedAt: { type: Date, default: Date.now }
});

const DeletedGoods = mongoose.model('DeletedGoods', DeletedGoodsSchema);

module.exports = DeletedGoods;
