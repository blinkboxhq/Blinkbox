export default {
  async run(config, input) {
    const b = input?.body ?? input;
    const payload = b?.payload ?? b;
    const event = payload?.event ?? {};
    const invitee = payload?.invitee ?? {};
    const tracking = payload?.tracking ?? {};
    return {
      event:            b?.event,
      eventUri:         event?.uri,
      eventName:        event?.name,
      eventStatus:      event?.status,
      eventStart:       event?.start_time,
      eventEnd:         event?.end_time,
      eventDuration:    event?.duration,
      eventType:        event?.event_type?.name || event?.event_type,
      location:         event?.location?.location || event?.location?.join_url,
      locationType:     event?.location?.type,
      joinUrl:          event?.location?.join_url,
      inviteeUri:       invitee?.uri,
      inviteeName:      invitee?.name,
      inviteeEmail:     invitee?.email,
      inviteeTimezone:  invitee?.timezone,
      inviteeLocale:    invitee?.locale,
      cancelReason:     payload?.cancellation?.reason,
      canceledBy:       payload?.cancellation?.canceled_by,
      rescheduleUrl:    invitee?.reschedule_url,
      cancelUrl:        invitee?.cancel_url,
      utmSource:        tracking?.utm_source,
      utmMedium:        tracking?.utm_medium,
      utmCampaign:      tracking?.utm_campaign,
      questions:        invitee?.questions_and_answers ?? [],
      createdAt:        payload?.created_at,
    };
  },
};
