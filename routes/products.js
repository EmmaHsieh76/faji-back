import { Router } from 'express'
import * as auth from '../middlewares/auth.js'
import { create, getAll, edit, get, remove, getId } from '../controllers/products.js'
import upload from '../middlewares/upload.js'
import admin from '../middlewares/admin.js'

const router = Router()
// 驗證有無登入，判斷是不是管理員，是的話再處理上傳檔案，再建立資料庫
router.post('/', auth.jwt, admin, upload, create)
// 驗證有無登入，是不是管理員，是的話取得所有商品
router.get('/all', auth.jwt, admin, getAll)
// 編輯商品
router.patch('/:id', auth.jwt, admin, upload, edit)
router.get('/', get)
router.get('/:id', getId)
router.delete('/:id', auth.jwt, admin, remove)

export default router
