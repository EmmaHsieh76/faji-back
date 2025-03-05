import users from '../models/users.js'
import { StatusCodes } from 'http-status-codes'
// `jsonwebtoken` 是一個用於創建和驗證 JSON Web Tokens 的 Node.js 套件。JSON Web Tokens 是一種用於安全傳輸資訊的方式，常用於身份驗證和資訊交換。
// 登入要嵌一組token， jsonwebtoken=>來自passport-jwt
import jwt from 'jsonwebtoken'
import products from '../models/products.js'
import validator from 'validator'

// 建立使用者
export const create = async (req, res) => {
  try {
    // 不用特別告訴前端建立的資訊，只要告訴前端建立成功就好
    await users.create(req.body)
    res.status(StatusCodes.OK).json({
      success: true,
      message: ''
    })
  } catch (error) {
    // 驗證錯誤
    if (error.name === 'ValidationError') {
      const key = Object.keys(error.errors)[0]
      // ?
      const message = error.errors[key].message
      res.status(StatusCodes.BAD_REQUEST).json({
        // BAD_REQUEST => 400
        success: false,
        message
      })
      //  MongoDB 伺服器出現錯誤或資料重複
    } else if (error.name === 'MongoServerError' && error.code === 11000) {
      console.log(error)
      res.status(StatusCodes.CONFLICT).json({
        // HTTP 狀態碼 409（CONFLICT）和訊息「帳號已註冊」。
        success: false,
        message: '帳號已註冊'
      })
      // 其他錯誤
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        // INTERNAL_SERVER_ERROR => 500
        success: false,
        message: '未知錯誤'
      })
    }
  }
}

// 登入
export const login = async (req, res) => {
  try {
    console.log(req.user._id)
    // 給一組token
    // jwt的token => jwt.sign(要保存的id,密鑰,過期)
    const token = jwt.sign({ _id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '14 days' })
    // 把上面token，放入使用者的token裡面
    req.user.tokens.push(token)
    // 並保存
    await req.user.save()
    // 前端需要的全部資料回傳給前端
    // 前端登入需要的使用者資料全部回回去
    res.status(StatusCodes.OK).json({
      success: true,
      message: '',
      result: {
        token,
        _id: req.user._id,
        role: req.user.role,
        // cartQuantity 來自 models=>users.js 虛擬欄位用來將購物車內商品的數量加總
        cart: req.user.cartQuantity,
        name: req.user.name,
        phone: req.user.phone,
        avatar: req.user.avatar,
        blacklist: req.user.blacklist,
        blacklistReason: req.user.blacklistReason
      }
    })
  } catch (error) {
    // INTERNAL_SERVER_ERROR => http狀態碼500
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '未知錯誤'
    })
  }
}

// 登出
// 把在mongodb的token清空
export const logout = async (req, res) => {
  try {
    // 使用者的token去過濾token，條件是每一個token不等於這一次請求的token
    req.token = req.user.tokens.filter(token => token !== req.token)
    // 保存
    await req.user.save()
    // 回傳http狀態碼
    res.status(StatusCodes.OK).json({
      success: true,
      // 登出成功也不需要回覆內容
      message: ''
    })
  } catch (error) {
    // INTERNAL_SERVER_ERROR => http狀態碼500
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '未知錯誤'
    })
  }
}

// 舊換新
// 把這次舊的token換成新的token
export const extend = async (req, res) => {
  try {
    // 先找到舊token在原始陣列中的位置
    const idx = req.user.tokens.findIndex(token => token === req.token)
    // 找到後，嵌入新的jwt，token
    // jwt的token => jwt.sign(要保存的id,密鑰,過期)
    const token = jwt.sign({ _id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '7 days' })
    // 舊user.token的位置的內容換成新的token
    req.user.tokens[idx] = token
    // 保存
    await req.user.save()
    // 回傳http狀態碼
    req.status(StatusCodes.OK).json({
      success: true,
      message: '',
      result: token
    })
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '未知錯誤'
    })
  }
}

// 個人資訊回傳給前端
// 前端不會保存個人資料只會保存jwt
// 登入後回到網頁，用pinia裡的jwt去發請求得到個人資料(帳號、信箱、管理權限等等)
export const getProfile = async (req, res) => {
  try {
    res.status(StatusCodes.OK).json({
      success: true,
      message: '',
      result: {
        _id: req.user._id,
        account: req.user.account,
        role: req.user.role,
        // cartQuantity 來自 models=>users.js 虛擬欄位，用來將購物車內商品的數量加總
        cart: req.user.cartQuantity,
        name: req.user.name,
        phone: req.user.phone,
        avatar: req.user.avatar,
        blacklist: req.user.blacklist,
        blacklistReason: req.user.blacklistReason
      }
    })
  } catch (error) {
    // INTERNAL_SERVER_ERROR => http狀態碼500
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '未知錯誤'
    })
  }
}

// 修改購物車
export const editCart = async (req, res) => {
  try {
    // 檢查商品 id 格式對不對
    if (!validator.isMongoId(req.body.product)) throw new Error('ID')

    // 尋找購物車內有沒有傳入的商品 ID
    const idx = req.user.cart.findIndex(item => item.product.toString() === req.body.product)
    if (idx > -1) {
      // 修改購物車內已有的商品數量
      const quantity = req.user.cart[idx].quantity + parseInt(req.body.quantity)
      // 檢查數量
      // 小於 0，移除
      // 大於 0，修改
      if (quantity <= 0) {
        req.user.cart.splice(idx, 1)
      } else {
        req.user.cart[idx].quantity = quantity
      }
    } else {
      // 檢查商品是否存在或已下架
      const product = await products.findById(req.body.product).orFail(new Error('NOT FOUND'))
      if (!product.sell) {
        throw new Error('NOT FOUND')
      } else {
        req.user.cart.push({
          product: product._id,
          quantity: req.body.quantity
        })
      }
    }
    await req.user.save()
    res.status(StatusCodes.OK).json({
      success: true,
      message: '',
      result: req.user.cartQuantity
    })
  } catch (error) {
    console.log(error)
    if (error.name === 'CastError' || error.message === 'ID') {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'ID 格式錯誤'
      })
    } else if (error.message === 'NOT FOUND') {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '查無商品'
      })
    } else if (error.name === 'ValidationError') {
      const key = Object.keys(error.errors)[0]
      const message = error.errors[key].message
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message
      })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '未知錯誤'
      })
    }
  }
}

export const getCart = async (req, res) => {
  try {
    const result = await users.findById(req.user._id, 'cart').populate('cart.product')
    res.status(StatusCodes.OK).json({
      success: true,
      message: '',
      result: result.cart
    })
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '未知錯誤'
    })
  }
}

// ==================== 編輯管理使用者 ====================
// ===== 取全部使用者 - 管理員用
export const getAll = async (req, res) => {
  try {
    // === 取得所有使用者，設定顯示條件
    /*
      --- req 的參數，可以取得當前的路由資訊
        ->  req.originalUrl = /users/test?aaa=111&bbb=2
            req.query = { aaa: 111, bbb: 222 }
    */
    const sortBy = req.query.sortBy || 'createdAt' // 依照什麼排序，預設是建立時間
    const sortOrder = parseInt(req.query.sortOrder) || -1 // 正序or倒序，預設倒序（時間的話是新到舊
    const itemsPerPage = parseInt(req.query.itemsPerPage) || 20 // 一頁幾筆，預設 20 筆
    const page = parseInt(req.query.page) || 1 // 現在是第幾頁，預設第 1 頁
    const regex = new RegExp(req.query.search || '', 'i') // 關鍵字搜尋，沒傳值就是空字串，i 是設定不分大小寫

    const data = await users
      .find({
        $or: [{ account: regex }, { email: regex }] // $ or mongoose 的語法，找 account 或 email 欄位符合 regex 的資料。直接寫文字是找完全符合的資料，這邊用正則表示式找部分符合的資料
      })
      /*
        // [sortBy] 把變數當成 key 來用，不是陣列
        -> 舉例
          const text = 'a'
          const obj = { [text]: 1 }
          obj.a = 1
      */
      .sort({ [sortBy]: sortOrder })
      // 如果一頁 10 筆
      // 第 1 頁 = 0 ~ 10 = 跳過 0 筆 = (1 - 1) * 10
      // 第 2 頁 = 11 ~ 20 = 跳過 10 筆 = (2 - 1) * 10
      // 第 3 頁 = 21 ~ 30 = 跳過 20 筆 = (3 - 1) * 10
      .skip((page - 1) * itemsPerPage)
      // 前端有顯示全部選項，如果是 -1 就用 undefined 限制，會顯示全部
      .limit(itemsPerPage === -1 ? undefined : itemsPerPage)

    // === estimatedDocumentCount() 計算總資料數
    const total = await users.estimatedDocumentCount()
    // === 回傳成功結果
    res.status(StatusCodes.OK).json({
      success: true,
      message: '',
      result: {
        data,
        total
      }
    })
  } catch (error) {
    console.log(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '未知錯誤'
    })
  }
}

// ===== 編輯使用者
export const edit = async (req, res) => {
  try {
    console.log(req.params.id)
    if (!validator.isMongoId(req.params.id)) throw new Error('ID')

    // 1. 先把圖片路徑放進 req.body.image
    // 編輯時前端不一定會傳圖片，req.file 是 undefined，undefined 沒有 .path 所以要用 ?. 避免錯誤
    // req.body.avatar = req.file?.path
    // 2. 再丟 req.body 更新資料，如果沒有圖片 req.file?.path 就是 undefined，不會更新圖片
    // .findByIdAndUpdate(要修改的資料 ID, 要修改的資料, { 更新時是否執行驗證: 預設 false })
    await users.findByIdAndUpdate(req.params.id, req.body, { runValidators: true }).orFail(new Error('NOT FOUND')) // orFail() 如果沒有找到資料，就自動丟出錯誤

    res.status(StatusCodes.OK).json({
      success: true,
      message: ''
    })
  } catch (error) {
    console.log(error)
    if (error.name === 'CastError' || error.message === 'ID') {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'ID 格式錯誤'
      })
    } else if (error.message === 'NOT FOUND') {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '查無使用者'
      })
    } else if (error.name === 'ValidationError') {
      const key = Object.keys(error.errors)[0]
      const message = error.errors[key].message
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message
      })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '未知錯誤'
      })
    }
  }
}

// ===== 使用者編輯自己
export const editSelf = async (req, res) => {
  try {
    if (!validator.isMongoId(req.user._id.toString())) throw new Error('ID')

    await users.findByIdAndUpdate(req.user._id, req.body, { runValidators: true }).orFail(new Error('NOT FOUND')) // orFail() 如果沒有找到資料，就自動丟出錯誤

    res.status(StatusCodes.OK).json({
      success: true,
      message: ''
    })
  } catch (error) {
    console.log(error)
    if (error.name === 'CastError' || error.message === 'ID') {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '請求使用者 ID 格式錯誤 user controller editSelf'
      })
    } else if (error.message === 'NOT FOUND') {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '查無使用者'
      })
    } else if (error.name === 'ValidationError') {
      const key = Object.keys(error.errors)[0]
      const message = error.errors[key].message
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message
      })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '未知錯誤'
      })
    }
  }
}

// ===== 換大頭貼
export const avatar = async (req, res) => {
  try {
    /*
    console.log(req.file) -> 得到以下物件
    {
      fieldname: 'image',
      originalname: '0104.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      path: 'https://res.cloudinary.com/xxx.jpg',
      size: 46736,
      filename: 'wfsjhnj7mhucazq9rcpj'
    }
    */
    // 把大題貼改成這次檔案上傳的路徑
    req.user.avatar = req.file.path // 多檔上傳 req.files
    // 保存
    await req.user.save()
    // 回覆成功
    res.status(StatusCodes.OK).json({
      success: true,
      message: '',
      result: req.user.avatar
    })
  } catch (error) {
    console.log(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '伺服器錯誤'
    })
  }
}

// ===== 刪除使用者
export const remove = async (req, res) => {
  try {
    if (!validator.isMongoId(req.params.id)) throw new Error('ID')

    await users.findByIdAndDelete(req.params.id).orFail(new Error('NOT FOUND'))

    res.status(StatusCodes.OK).json({
      success: true,
      message: ''
    })
  } catch (error) {
    if (error.name === 'CastError' || error.message === 'ID') {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'ID 格式錯誤'
      })
    } else if (error.message === 'NOT FOUND') {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '查無使用者'
      })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '未知錯誤'
      })
    }
  }
}
