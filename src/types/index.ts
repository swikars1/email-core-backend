export type MicrosoftGraphSubscription = {
  "@odata.context": string;
  id: string;
  resource: string;
  applicationId: string;
  changeType: string;
  clientState: string;
  notificationUrl: string;
  notificationQueryOptions: null | string; // Allowing for potential non-null values
  lifecycleNotificationUrl: string;
  expirationDateTime: string; // ISO 8601 date string
  creatorId: string;
  includeResourceData: boolean;
  latestSupportedTlsVersion: string;
  encryptionCertificate: string;
  encryptionCertificateId: string;
  notificationUrlAppId: null | string; // Allowing for potential non-null values
};

export type LocalSubscription = MicrosoftGraphSubscription & {
  userId: string;
  mailFolderId: string;
};

export type Mailboxes = {
  emailAddress: string;
  userId: string;
  accessToken: string;
  syncStatus: string;
  lastSyncTime: string;
};
