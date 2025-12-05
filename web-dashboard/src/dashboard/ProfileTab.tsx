// src/dashboard/ProfileTab.tsx
import React, { useState, useCallback } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import type { UserFamilySummary } from './types'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const EasyCrop = Cropper as unknown as React.FC<any>

interface ProfileTabProps {
  profileName: string | null
  profileEmail: string | null
  profileAvatarUrl: string | null
  initials: string
  families: UserFamilySummary[]
  onUploadAvatar: (file: File) => Promise<void>
  onClearAvatar: () => Promise<void>
  onCreateFamily: () => Promise<void> | void
}

async function getCroppedImageFile(
  imageSrc: string,
  croppedAreaPixels: Area,
  fileName = 'avatar.jpg'
): Promise<File> {
  const image = new Image()
  image.src = imageSrc

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('Failed to load image for cropping'))
  })

  const canvas = document.createElement('canvas')
  canvas.width = croppedAreaPixels.width
  canvas.height = croppedAreaPixels.height
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Could not get canvas context')
  }

  ctx.drawImage(
    image,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    croppedAreaPixels.width,
    croppedAreaPixels.height
  )

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'))
          return
        }
        const file = new File([blob], fileName, { type: 'image/jpeg' })
        resolve(file)
      },
      'image/jpeg',
      0.9
    )
  })
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  profileName,
  profileEmail,
  profileAvatarUrl,
  initials,
  families,
  onUploadAvatar,
  onClearAvatar,
  onCreateFamily,
}) => {
  const [rawFile, setRawFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setError(null)

    if (!file) {
      setRawFile(null)
      setPreviewUrl(null)
      return
    }

    // Lightweight validation
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }

    const url = URL.createObjectURL(file)
    setRawFile(file)
    setPreviewUrl(url)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
  }

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels)
  }, [])

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rawFile || !previewUrl) {
      setError('Please choose an image file first.')
      return
    }
    if (!croppedAreaPixels) {
      setError('Cropping area not ready. Try adjusting the crop slightly.')
      return
    }

    setUploading(true)
    setError(null)

    try {
      // Create a cropped square image file from the selected area
      const croppedFile = await getCroppedImageFile(
        previewUrl,
        croppedAreaPixels,
        rawFile.name || 'avatar.jpg'
      )

      await onUploadAvatar(croppedFile)

      // Clean up
      setRawFile(null)
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      setPreviewUrl(null)
      setCroppedAreaPixels(null)
    } catch (err) {
      console.error(err)
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleClear = async () => {
    setUploading(true)
    setError(null)
    try {
      await onClearAvatar()
    } catch (err) {
      console.error(err)
      setError('Could not remove avatar.')
    } finally {
      setUploading(false)
    }
  }

  const handleCreateFamilyClick = async () => {
    await onCreateFamily()
  }

  const showAvatar = Boolean(profileAvatarUrl)

  return (
    <section>
      <h2>Profile</h2>
      <p style={{ color: '#bbb', marginBottom: 16 }}>
        Manage your account details and families.
      </p>

      {/* Top: avatar + basic info */}
      <div
        style={{
          display: 'flex',
          gap: 24,
          alignItems: 'flex-start',
          marginBottom: 32,
        }}
      >
        {/* Avatar */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: '50%', // circle display
              border: '2px solid #444',
              backgroundColor: '#1f2937',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              fontWeight: 600,
              color: '#e5e7eb',
              overflow: 'hidden',
              marginBottom: 8,
            }}
          >
            {showAvatar ? (
              <img
                src={profileAvatarUrl ?? undefined}
                alt="Profile picture"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              initials || '?'
            )}
          </div>
          <div style={{ fontSize: 13, color: '#9ca3af' }}>
            This picture also appears in the header.
          </div>
        </div>

        {/* Info + upload form */}
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: 16 }}>
            <p style={{ margin: 0 }}>
              <strong>Name:</strong> {profileName ?? '(not set)'}
            </p>
            <p style={{ margin: 0 }}>
              <strong>Email:</strong> {profileEmail ?? '(unknown)'}
            </p>
          </div>

          <form
            onSubmit={handleUpload}
            style={{
              border: '1px solid #333',
              borderRadius: 8,
              padding: 12,
              backgroundColor: '#181818',
              maxWidth: 520,
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 15 }}>
              Profile picture
            </h3>
            <p style={{ marginTop: 0, marginBottom: 8, fontSize: 13, color: '#9ca3af' }}>
              Choose an image, adjust the crop, and we&apos;ll save a square version. It
              will be displayed as a circle.
            </p>

            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ marginBottom: 8 }}
            />

            {/* Cropping preview */}
            {previewUrl && (
              <div
                style={{
                  position: 'relative',
                  width: 260,
                  height: 260,
                  marginTop: 8,
                  marginBottom: 8,
                  background: '#000',
                  borderRadius: 8,
                  overflow: 'hidden',
                }}
              >
                <EasyCrop
                  image={previewUrl}
                  crop={crop}
                  zoom={zoom}
                  aspect={1} // square crop
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>
            )}

            {previewUrl && (
              <div style={{ marginBottom: 8 }}>
                <label
                  style={{
                    display: 'inline-block',
                    fontSize: 12,
                    color: '#9ca3af',
                    marginRight: 8,
                  }}
                >
                  Zoom
                </label>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                />
              </div>
            )}

            {error && (
              <div style={{ color: '#f97373', fontSize: 13, marginBottom: 8 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-start' }}>
              <button
                type="submit"
                disabled={uploading || !previewUrl || !rawFile}
                style={{
                  padding: '6px 12px',
                  borderRadius: 4,
                  border: '1px solid #3b82f6',
                  backgroundColor: previewUrl ? '#2563eb' : '#1e3a8a',
                  color: '#fff',
                  cursor: uploading || !previewUrl || !rawFile ? 'default' : 'pointer',
                  fontSize: 13,
                }}
              >
                {uploading ? 'Uploading…' : 'Upload picture'}
              </button>

              {profileAvatarUrl && (
                <button
                  type="button"
                  onClick={() => void handleClear()}
                  disabled={uploading}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 4,
                    border: '1px solid #444',
                    backgroundColor: '#1a1a1a',
                    color: '#f97316',
                    cursor: uploading ? 'default' : 'pointer',
                    fontSize: 13,
                  }}
                >
                  Remove picture
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Families list */}
      <div>
        <h3 style={{ fontSize: 16, marginBottom: 8 }}>Families</h3>
        <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 12 }}>
          You can belong to multiple families. Your default family is used in the main
          dashboard.
        </p>

        {families.length === 0 ? (
          <p style={{ fontSize: 14, color: '#bbb' }}>
            You&apos;re not in any families yet.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', paddingLeft: 0, marginBottom: 16 }}>
            {families.map((fam) => (
              <li
                key={fam.id}
                style={{
                  border: '1px solid #333',
                  borderRadius: 6,
                  padding: 8,
                  backgroundColor: '#181818',
                  marginBottom: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{fam.name}</div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>
                    Role:{' '}
                    {fam.role === 'owner'
                      ? 'Admin'
                      : fam.role.charAt(0).toUpperCase() + fam.role.slice(1)}
                    {fam.is_default && (
                      <span style={{ color: '#60a5fa' }}> · default</span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={() => void handleCreateFamilyClick()}
          style={{
            padding: '6px 12px',
            borderRadius: 4,
            border: '1px solid #22c55e',
            backgroundColor: '#16a34a',
            color: '#fff',
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          + Create new family
        </button>
      </div>
    </section>
  )
}
