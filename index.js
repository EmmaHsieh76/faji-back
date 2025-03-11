// dotenv 是一個讀取 .env 檔案的套件，可以用來設定環境變數
import 'dotenv/config'
// express 是一個 Node.js 的 web 框架
import express from 'express'
// mongoose 是一個 MongoDB 的 ODM 套件，可以用來在 Node.js 中連接 MongoDB 資料庫
import mongoose from 'mongoose'
// cors 是否允許跨域請求
import cors from 'cors'
// 使用者路由
import routeUsers from './routes/users.js'
// 產品路由
import routerProducts from './routes/products.js'
// 訂單路由
import routeOrders from './routes/orders.js'
// 狀態碼
import { StatusCodes } from 'http-status-codes'
// 登入註冊策略
import './passport/passport.js'

const app = express()

// 設定誇域請求
app.use(
  cors({
    // origim(origin,callback){}
    // origin: 請求的來源如果來源。postman=>會產生undifined
    // callback(錯誤, 是否允許請求): 是否允許請求為true，錯誤為null
    origin (origin, callback) {
      // 如果是undefined(可能是postman或是後端請求)或是github或是localhost，就允許請求
      if (origin === undefined || origin.includes('github.io') || origin.includes('localhost')) {
        callback(null, true)
      } else {
        // 網域不允許就發出CORS的錯誤
        callback(new Error('CORS'), false)
      }
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  })
)
// 401 => 未授權，我不知道你是誰
// 403 => FORBIDDEN 禁止，我知道你是誰，但你沒有權限
// app.use((_, req, res, next) => {
//   res.status(StatusCodes.FORBIDDEN).json({
//     success: false,
//     message: '請求被拒絕'
//   })
// })

app.use(express.json())
app.use((_, req, res, next) => {
  res.status(StatusCodes.BAD_REQUEST).json({
    success: false,
    message: '資料格式錯誤'
  })
})

// 把/users應用到routeUsers
app.use('/users', routeUsers)
// 把/products應用到routerProducts
app.use('/products', routerProducts)
// 把/orders應用到routeOrders
app.use('/orders', routeOrders)

// all() => 所有的HTTP請求方法，ex: get,post,put,delete
// * => 所有的路徑
// 讓我們沒寫的路徑都會顯示找不到
app.all('*', (req, res) => {
  res.status(StatusCodes.NOT_FOUND).json({
    // NOT_FOUND => 404
    success: false,
    message: '找不到'
  })
})

// 如果雲端伺服器有指定環境變數 PORT，就用環境變數的值，否則就用 400
app.listen(process.env.PORT || 4000, async () => {
  console.log('伺服器啟動')
  // mongoose.connect是promise，所以要用await，連上伺服器後再顯示資料庫連接成功
  await mongoose.connect(process.env.DB_URL)
  console.log('資料庫連接成功')
})
