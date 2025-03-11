import products from '../models/products.js'
import { StatusCodes } from 'http-status-codes'
import validator from 'validator'

export const create = async (req, res) => {
  try {
    // 單張圖寫法
    // req.body.image = req.file.path
    // 多張圖寫法
    req.body.images = req.files.map(file => file.path)

    const result = await products.create(req.body)
    return res.status(StatusCodes.OK).json({
      success: true,
      message: '',
      result
    })
  } catch (error) {
    console.log('controller的product',error)
    // 驗證錯誤
    if (error.name === 'ValidationError') {
      const key = Object.keys(error.errors)[0]
      // ?
      const message = error.errors[key].message
      return res.status(StatusCodes.BAD_REQUEST).json({
        // BAD_REQUEST => 400
        success: false,
        message
      })
      //  MongoDB 伺服器出現錯誤或資料重複
    } else {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        // INTERNAL_SERVER_ERROR => 500
        success: false,
        message: '未知錯誤'
      })
    }
  }
}

// 查所有商品
export const getAll = async (req, res) => {
  try {
    // 排序的依據欄位，預設是建立時間
    const sortBy = req.query.sortBy || 'createdAt'
    // 文字轉數字，沒有前面就是後面-1
    const sortOrder = parseInt(req.query.sortOrder) || -1
    // 文字轉數字，沒有前面就是後面20
    const itemsPerPage = parseInt(req.query.itemsPerPage) || 20
    // 同上
    const page = parseInt(req.query.page) || 1
    // 正則表達式，大小寫不分 => i。搜尋字串變成正則表達式
    const regex = new RegExp(req.query.search || '', 'i')

    // itemsPerPage =10 如果一頁10筆資料
    // page= 1 地一頁
    // skip = 0 跳過0筆資料
    // limit = 10  取10筆資料

    // page = 2
    // skip = 10 = (2-1)*10 跳過10筆資料

    // page = 3
    // skip = 10 = (3-1)*10 跳過20筆資料

    // .skip((page - 1) * itemsPerPage) 跳過多少筆資料

    const data = await products
      // 查詢
      .find({
        $or: [
        // 名字或說明要符合正則表達式
          { name: regex },
          { description: regex }
        ]
      })
      // 排序，變數的值變成物件的key 所以要用[]，固定語法
      // const text = 'a'
      // const obj = {[text]:123}
      // obj.a = 123
      .sort({ [sortBy]: sortOrder })
      // 跳過幾筆資料
      // 如果一頁10筆資料，第一頁要跳過0筆資料，第二頁要跳過10筆資料
      .skip((page - 1) * itemsPerPage)
      .limit(itemsPerPage === -1 ? undefined : itemsPerPage)

    // estimatedDocumentCount() 計算總資料數
    const total = await products.estimatedDocumentCount()
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

// 只取有上架的所有商品=>前台看得到
export const get = async (req, res) => {
  try {
    const sortBy = req.query.sortBy || 'createdAt'
    const sortOrder = parseInt(req.query.sortOrder) || -1
    const itemsPerPage = parseInt(req.query.itemsPerPage) || 20
    const page = parseInt(req.query.page) || 1
    const regex = new RegExp(req.query.search || '', 'i')

    const data = await products
      .find({
        // 只取有上架的商品
        sell: true,
        $or: [
          { name: regex },
          { description: regex }
        ]
      })
      // const text = 'a'
      // const obj = { [text]: 1 }
      // obj.a = 1
      .sort({ [sortBy]: sortOrder })
      // 如果一頁 10 筆
      // 第 1 頁 = 0 ~ 10 = 跳過 0 筆 = (1 - 1) * 10
      // 第 2 頁 = 11 ~ 20 = 跳過 10 筆 = (2 - 1) * 10
      // 第 3 頁 = 21 ~ 30 = 跳過 20 筆 = (3 - 1) * 10
      .skip((page - 1) * itemsPerPage)
      .limit(itemsPerPage === -1 ? undefined : itemsPerPage)

    // countDocuments() 依照 () 內篩選計算總資料數
    const total = await products.countDocuments({ sell: true })
    res.status(StatusCodes.OK).json({
      success: true,
      message: '',
      result: {
        data, total
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

// 取單個商品
export const getId = async (req, res) => {
  try {
    // 判斷網址的參數id是否格式正確
    if (!validator.isMongoId(req.params.id)) throw new Error('ID格式錯誤')

    // 網址格式正確
    const result = await products.findById(req.params.id)

    // 如果找不到
    if (!result) throw new Error('找不到商品')

    res.status(StatusCodes.OK).json({
      success: true,
      message: '',
      result
    })
  } catch (error) {
    if (error.name === 'CastError' || error.message === 'ID格式錯誤') {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'ID格式錯誤'
      })
    } else if (error.message === 'NOT_FOUND') {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '查無商品'
      })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '未知錯誤'
      })
    }
  }
}

// 修改商品
export const edit = async (req, res) => {
  try {
    // 檢查id格式有無錯誤
    if (!validator.isMongoId(req.params.id)) throw new Error('ID')

    // 因為前端有可能沒有傳圖片，所以無圖片時.?才不會出現undefined
    req.body.images = req.files?.map(file => file.path)
    // 去商品的model以id查東西，req.params.id=>要查的東西，req.body=>要更新的內容，runValidators=>要不要在更新時執行驗證，.orFail()=> id不存在會產生錯誤訊息
    await products.findByIdAndUpdate(req.params.id, req.body, { runValidators: true }).orFail(new Error('NOT FOUND'))

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

// 刪除商品
export const remove = async (req, res) => {
  try {
    if (!validator.isMongoId(req.params.id)) throw new Error('ID')

    await products.findByIdAndDelete(req.params.id).orFail(new Error('NOT FOUND'))

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
        message: '查無商品'
      })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '未知錯誤'
      })
    }
  }
}
