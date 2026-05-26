export default {
  async run(config, input) {
    const b = input?.body ?? input;
    const data = b?.data ?? b;
    return {
      event:          b?.type || b?.event,
      listId:         data?.list_id,
      email:          data?.email,
      emailId:        data?.email_id,
      memberId:       data?.id,
      webId:          data?.web_id,
      mergeFields:    data?.merges ?? {},
      firstName:      data?.merges?.FNAME,
      lastName:       data?.merges?.LNAME,
      fullName:       [data?.merges?.FNAME, data?.merges?.LNAME].filter(Boolean).join(" "),
      status:         data?.status,
      oldStatus:      data?.old_status,
      reason:         data?.reason,
      campaignId:     data?.campaign_id,
      ip:             data?.ip_opt || data?.ip_signup,
      latitude:       data?.geo?.latitude,
      longitude:      data?.geo?.longitude,
      timezone:       data?.geo?.timezone,
      country:        data?.geo?.country,
      region:         data?.geo?.region,
      source:         data?.source,
      firedAt:        b?.fired_at,
    };
  },
};
