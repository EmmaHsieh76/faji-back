import { Router } from 'express'
import { create, login, logout, extend, getProfile, editCart, getCart, edit, getAll, remove } from '../controllers/users.js'
import * as auth from '../middlewares/auth.js'
import upload from '../middlewares/upload.js'
import admin from '../middlewares/admin.js'

const router = Router()
router.post('/', create)
// 登入要先經過auth.login，再經過login
router.post('/login', auth.login, login)
// 登出要先經過auth.jwt，再經過logout
router.delete('/logout', auth.jwt, logout)
// 舊換新token (petch()用於更新資料)
router.patch('/extend', auth.jwt, extend)
// 取得使用者資料
router.get('/me', auth.jwt, getProfile)
// 修改購物車資料
router.patch('/cart', auth.jwt, editCart)
// 拿取購物車資料
router.get('/cart', auth.jwt, getCart)

router.patch('/user/:id', edit) // 用戶用編輯自己的資料

// =========== 管理者用 ===========
router.get('/all', auth.jwt, admin, getAll) // 管理者用
router.patch('/:id', auth.jwt, admin, upload, edit) // 管理者用編輯全部
router.delete('/:id', auth.jwt, admin, remove)
export default router
