// 處理form data的資料型態
import multer from 'multer'
// 雲端平台套件
import { v2 as cloudinary } from 'cloudinary'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
// 狀態碼
import { StatusCodes } from 'http-status-codes'

// 設定雲端平台
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
})

const upload = multer({
  // 上傳的設定
  storage: new CloudinaryStorage({ cloudinary }),
  // 限制上傳的類型
  // req=>請求資訊
  // file=>上傳的檔案
  // callback=>判斷是否允許這個檔案上傳
  fileFilter (req, file, callback) {
    if (['image/png', 'image/jpg', 'image/jpeg'].includes(file.mimetype)) {
      callback(null, true)
    } else {
      callback(new multer.MulterError('LIMIT_FILE_FORMAT'), false)
    }
  },
  // 限制上傳的大小 1024*1024 => 1MB
  limits: {
    fileSize: 1024 * 1024
  }
})

// 處理檔案大小錯誤及格式錯誤
// 處理單張或多張圖片
export default (req, res, next) => {
   console.log('🚀 req.body:', req.body); // 檢查請求的 body
  // 單張圖片用single('image')
  // 多張圖片用陣列array('image',3)
    // 根據請求中的 files 來決定上傳模式
    // const uploadHandler = req.files && req.files.length > 1
    // ? upload.array('images', 3)  // 多張圖片
    // : upload.single('image')     // 單張圖片
  // uploadHandler
  
    upload.any()(req, res, error => {
      console.log('req.file:單張圖片:', req.file);
      console.log('req.files:多張圖片:', req.files);
      res.status(StatusCodes.OK).json({
        success: true,
        message: '上傳成功',
        result: req.files[0].path  // 確保回傳 Cloudinary 的圖片 URL
      })
      
      if (!req.files || req.files.length === 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: '沒有上傳任何檔案'
        })
       }
      
      if (error instanceof multer.MulterError) {
      // 預設訊息是上傳錯誤
      let message = '上傳錯誤'
      if (error.code === 'LIMIT_FILE_SIZE') {
        message = '檔案太大'
      } else if (error.code === 'LIMIT_FILE_FORMAT') {
        message = '檔案格式錯誤'
      }
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message
      })
    } else if (error) {
      console.log(error)
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '未知錯誤'
      })
    } else {
      next()
    }
  })
}
