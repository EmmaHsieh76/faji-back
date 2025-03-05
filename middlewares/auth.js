import passport from 'passport'
import { StatusCodes } from 'http-status-codes'
import jsonwebtoken from 'jsonwebtoken'

// 透過 passport 進行登錄驗證，根據身分認證結果返回相應的 HTTP 響應狀態碼消息

export const login = (req, res, next) => {
  /* passport.authenticate(strategy, options, callback)

   1. strategy :驗證策略名稱

   2. options :可选对象，用于指定附加的选項，常見選項=> session:如果设置为 false，将禁用会话支持

   3. callback : 回调函数，用于处理身份验证的结果，有三個參數
   - error: 表示身份验证过程中是否发生了错误，如果没有错误，为 null。
   - user: 表示身份验证成功时的用户对象，如果身份验证失败，为 false 或 undefined。從Passport的驗證策略中返回的user對象
   - info: 一个包含有关身份验证过程的额外信息的可选对象。
   */

  passport.authenticate('login', { session: false }, (error, user, info) => {
    if (!user || error) {
      // Missing credentials => 套件語法
      if (info.message === 'Missing credentials') {
        // BAD_REQUEST => 400
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: '欄位錯誤'
        })
        return
      } else if (info.message === '未知錯誤') {
        // INTERNAL_SERVER_ERROR => 500
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: '未知錯誤middleware'
        })
        return
      } else {
        // 缺少欄位未驗證  => 401
        res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: info.message
        })
        return
      }
    }
    // user為passport驗證策略中返回的user對象，放進req.user，使controller可以用來取得user資料
    req.user = user
    next()
  })(req, res, next)
}

export const jwt = (req, res, next) => {
  // passport的驗證方式
  passport.authenticate('jwt', { session: false }, (error, data, info) => {
    if (error || !data) {
      // JWT 格式不對 SECRET驗證錯誤
      if (info instanceof jsonwebtoken.JsonWebTokenError) {
        res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: 'JWT無效'
        })
      } else if (info.message === '未知錯誤') {
        // INTERNAL_SERVER_ERROR => 500
        console.log('middle驗證錯誤',error.message)
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: '未知錯誤'
        })
      } else {
        // 其他的錯誤
        res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: 'info.message'
        })
      }
      return
    }
    // data為passport驗證策略中返回的data，放進req.user，使controller可以用來取得data資料
    req.user = data.user
    req.token = data.token
    next()
  })(req, res, next)
}
