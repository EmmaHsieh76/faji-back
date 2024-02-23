// 身分驗證策略
import passport from 'passport'
import passportLocal from 'passport-local'
import passportJWT from 'passport-jwt'
// 加密
import bcrypt from 'bcrypt'
import users from '../models/users.js'

// 允許使用者用過期的jwt來請求
// passport.use(驗證方式, 驗證策略)
passport.use(
  'login',
  new passportLocal.Strategy(
    {
      // 設定傳進來的資料欄位
      usernameField: 'account',
      passwordField: 'password'
    },
    async (account, password, done) => {
      try {
        // 尋找傳入的帳號
        const user = await users.findOne({ account })
        // 如果沒有找到，拋出錯誤
        if (!user) throw new Error('ACCOUNT')
        // 比較明文密碼跟加密密碼，不一樣時拋出錯誤
        if (!bcrypt.compareSync(password, user.password)) {
          throw new Error('PASSWORD')
        }
        // 身分驗證完成
        return done(null, user, null)
      } catch (error) {
        console.log(error)
        if (error.message === 'ACCOUNT') {
          return done(null, null, { message: '帳號不存在' })
        } else if (error.message === 'PASSWORD') {
          return done(null, null, { message: '密碼錯誤' })
        } else {
          return done(null, null, { message: '未知錯誤passport' })
        }
      }
    }
  )
)

// jwt驗證策略，註冊一個驗證的方式
// 一個名叫jwt的驗證方式，使用jwt策略
// 這一段的用途:檢查過期，只有舊換新和登出的路徑可以有過期的jwt。
passport.use('jwt', new passportJWT.Strategy({
  jwtFromRequest: passportJWT.ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
  // 在callback取得請求的資訊
  passReqToCallback: true,
  // 讓jwt策略忽略過期檢查，下面callback再自己檢查
  ignoreExpiration: true
  // req: 請求物件的資訊,payload: 解譯出來的資訊,done: callback
}, async (req, payload, done) => {
  try {
    // 進到這裡代表callback，成功驗證使用者這次請求的jwt
    // payload.exp => jwt解譯出來的過期日期
    // 檢查過期 => node.js日期單位是毫秒，jwt過期單位是秒，所以要乘上1000
    const expired = payload.exp * 1000 < new Date().getTime()

    // 允許特地路徑有過期的jwt => 舊換新跟登出的路徑
    /*
    https://localhost:4000/users/test?aaa=111&bbb=222
    req.originalUrl => /users/test?aaa=111&bbb=222
    req.baseUrl => /users
    req.path => /test
    req.query => { aaa: '111', bbb: '222' }

    以上四個參數是req的資訊，可以用來取得目前請求的位置資訊
     */
    //
    const url = req.baseUrl + req.path
    // 只允許舊換新和登出的路徑有過期的jwt，其他都不允許
    if (expired && url !== '/users/extend' && url !== '/users/logout') {
      throw new Error('EXPIRED')
    }
    // 取請求的token
    const token = passportJWT.ExtractJwt.fromAuthHeaderAsBearerToken()(req)
    // 取得token後去檢查使用者是否存在
    const user = await users.findOne({ _id: payload._id, tokens: token })
    if (!user) {
      throw new Error('JWT')
    }
    return done(null, { user, token }, null)
  } catch (error) {
    if (error.message === 'EXPIRED') {
      return done(null, null, { message: 'JWT 過期' })
    } else if (error.message === 'JWT') {
      return done(null, null, { message: 'JWT 無效' })
    } else {
      return done(null, null, { message: '未知錯誤' })
    }
  }
}))
