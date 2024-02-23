import { Schema, model, ObjectId } from 'mongoose'

const cartSchema = new Schema({
  product: {
    type: ObjectId,
    ref: 'products',
    required: [true, '缺少商品欄位']
  },
  quantity: {
    type: Number,
    required: [true, '缺少商品數量']
  }
})

const schema = new Schema({
  user: {
    type: ObjectId,
    ref: 'users',
    required: [true, '缺少使用者']
  },
  cart: {
    type: [cartSchema],
    validate: {
      validator (value) {
        return Array.isArray(value) && value.length > 0
      },
      message: '購物車不能為空'
    }
  },
  date: {
    type: Date,
    required: [true, '缺少取貨日期']
  },
  time: {
    type: String,
    required: [true, '缺少取貨時間']
  },
  name: {
    type: String,
    required: [true, '缺少取貨人姓名']
  },
  phone: {
    type: String,
    required: [true, '缺少取貨人電話']
  }

}, { versionKey: false, timestamps: true })

export default model('orders', schema)
