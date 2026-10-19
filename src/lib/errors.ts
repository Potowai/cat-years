/**
 * Stable error codes shared between client and server. The server throws these
 * codes; the client maps them to a localized message so users always see copy
 * in their own language.
 */
export const ERR = {
  NOT_IMAGE: 'err.not_image',
  BAD_TYPE: 'err.bad_type',
  TOO_BIG: 'err.too_big',
  NO_PHOTO: 'err.no_photo',
  UPLOAD_FAILED: 'err.upload_failed',
  STORAGE_UNCONFIGURED: 'err.storage_unconfigured',
  BAD_UPLOAD: 'err.bad_upload',
  NOT_OWNER: 'err.not_owner',
  CAT_GONE: 'err.cat_gone',
  RATE_LIMITED: 'err.rate_limited',
  TOO_MANY_CATS: 'err.too_many_cats',
  /** A photo URL that this app did not issue for this cat. */
  PHOTO_NOT_YOURS: 'err.photo_not_yours',
  GENERIC: 'err.generic',
} as const

export type ErrorCode = (typeof ERR)[keyof typeof ERR]
