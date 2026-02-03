import { storage } from './firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

export async function uploadImage(file: File, folder: string): Promise<string> {
  try {
    // Create a unique filename
    const timestamp = Date.now()
    const filename = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const storageRef = ref(storage, `${folder}/${filename}`)

    // Upload the file
    await uploadBytes(storageRef, file)

    // Get the download URL
    const downloadURL = await getDownloadURL(storageRef)
    return downloadURL
  } catch (error) {
    console.error('Error uploading image:', error)
    throw error
  }
}

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024 // 5MB in bytes
  if (file.size > maxSize) {
    return { valid: false, error: 'Image must be smaller than 5MB' }
  }

  // Check file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  if (!validTypes.includes(file.type)) {
    return { valid: false, error: 'Please upload a valid image file (JPEG, PNG, GIF, or WebP)' }
  }

  return { valid: true }
}
