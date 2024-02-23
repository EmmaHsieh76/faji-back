// schema => 資料欄位定義用
// model => 連接mongoDB
// ObjectId => mongoose 中的数据类型，用于表示 MongoDB 文档的唯一标识符。
// Error => JavaScript 中的错误对象。
import { Schema, model, ObjectId, Error } from 'mongoose'
// 驗證器
import validator from 'validator'
// 加密
import bcrypt from 'bcrypt'
// 使用者權限
import UserRole from '../enums/UserRole.js'

const cartSchma = new Schema({
  // 商品
  product: {
    // mongoDB的資料的ID
    type: ObjectId,
    // ref = 參照 ，範例:ref:'products'=>代表這個id是從商品來的
    ref: 'products',
    required: [true, '缺少商品欄位']
  },
  // 數量
  quantity: {
    type: Number,
    required: [true, '缺少商品數量']
  }
})

// 帳號 密碼 token 購物車 使用者權限 姓名 電話 黑名單 黑名單原因
const schema = new Schema(
  {
    // 帳號 ->用email格式登陸
    account: {
      type: String,
      // 必填欄位
      required: [true, '缺少使用者帳號'],
      unique: true,
      validate: {
        validator (value) {
          // isAlphanumeric => 檢查字串是否僅包含字母和數字 (a-zA-Z0-9)。
          // isEmail => 檢查該字串是否為電子郵件。
          return validator.isEmail(value)
        },
        message: '使用者帳號格式錯誤'
      }
    },
    // 密碼:驗證方式另外寫，保存進去之前先驗證密碼加密
    password: {
      type: String,
      required: [true, '缺少使用者密碼']
    },
    // token
    tokens: {
      type: [String]
    },
    // 購物車
    cart: {
      type: [cartSchma]
    },
    // 權限
    role: {
      type: Number,
      // 預設為使用者
      default: UserRole.USER
    },
    // 姓名
    name: {
      type: String,
      required: [true, '缺少使用者姓名']
    },
    // 手機
    phone: {
      type: String,
      required: [true, '缺少使用者電話'],
      validate: {
        validator (value) {
          return validator.isMobilePhone(value, 'zh-TW')
        },
        message: '使用者電話格式錯誤'
      }
    },
    // 黑名單 ?
    blacklist: {
      type: Boolean,
      default: false
    },
    // 黑名單原因 ?
    blacklistReason: {
      type: String,
      default: ''
    }
  },
  {
    // 紀錄每一筆資料建立的日期
    timestamps: true,
    // 紀錄資料被改的次數
    versionKey: false
  }
)
// 建立虛擬欄位，用來計算購物車內商品的數量
schema.virtual('cartQuantity')
  .get(function () {
    // 購物車存商品id和數量，只回傳商品數量加總
    // reduce(()=>{},0) => 0是初始值，total是總數，current是目前的值，會跑迴圈把購物車內的數量加總
    return this.cart.reduce((total, current) => {
      return total + current.quantity
    }, 0)
  })

// 密碼資料庫
// 保存用户数据之前，检查并处理密码的修改。如果密码被修改且符合规定，将密码加密處理，否则会生成一个密码长度不符的验证错误
// mongoose語法 pre('save',...) => 保存檔案前執行的操作
schema.pre('save', function (next) {
  const user = this // 代表要保存進去的資料

  // 如果要保存進去的資料有修改到密碼欄位
  if (user.isModified('password')) {
    if (user.password.length < 4 || user.password.length > 20) {
      // 創造一個驗證錯誤對象
      const error = new Error.ValidationError(null)

      // 向錯誤對象添加一個密碼長度不符的錯誤訊息
      error.addError('password', new Error.ValidationError({ message: '密碼長度不符' }))

      next(error) // 將錯誤對象傳遞給express，允許錯誤傳遞到錯誤處理中間件進行處理

      return // 返回，結束函式執行
    } else {
      // 如果密碼符合規定，使用 bcrypt 進行加密處理
      user.password = bcrypt.hashSync(user.password, 10)
    }
  }
  next() // 繼續執行保存操作
})

// 建立名為users的模型在 mongoDB 數據庫上
// model(模型的名稱,模型對象)
export default model('users', schema)
