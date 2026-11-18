// cau hinh doc tu bien moi truong (client/.env)
export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '')

export const TOKEN_STORAGE_KEY = 'studyspace.token'
export const PROFILE_STORAGE_KEY = 'studyspace.profile'
