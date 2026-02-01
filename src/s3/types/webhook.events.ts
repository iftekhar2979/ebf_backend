interface WebhookEvent {
  EventName: string;
  Key: string;
  Records: Array<{
    eventVersion: string;
    eventSource: string;
    awsRegion: string;
    eventTime: string;
    eventName: string;
    userIdentity: {
      principalId: string;
    };
    requestParameters: {
      sourceIPAddress: string;
    };
    responseElements: {
      "x-amz-request-id": string;
      "x-amz-id-2": string;
    };
    s3: {
      bucket: {
        name: string;
        arn: string;
      };
      object: {
        key: string;
        size: number;
        eTag: string;
        sequencer: string;
        userMetadata: any;
      };
    };
    source: {
      host: string;
      port: string;
      userAgent: string;
    };
  }>;
}
