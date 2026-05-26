export default {
  async run(config, input) {
    const b = input?.body ?? input;
    const current = b?.current ?? b?.data ?? {};
    const previous = b?.previous ?? {};
    const meta = b?.meta ?? {};
    return {
      event:       b?.event,
      action:      meta?.action || b?.event?.split(".")?.[1],
      objectType:  meta?.object || b?.event?.split(".")?.[0],
      objectId:    current?.id,
      dealId:      current?.id,
      dealTitle:   current?.title,
      dealValue:   current?.value,
      dealCurrency: current?.currency,
      dealStatus:  current?.status,
      stageId:     current?.stage_id,
      pipelineId:  current?.pipeline_id,
      ownerId:     current?.owner_id,
      personId:    current?.person_id,
      orgId:       current?.org_id,
      wonTime:     current?.won_time,
      lostTime:    current?.lost_time,
      lostReason:  current?.lost_reason,
      addTime:     current?.add_time,
      updateTime:  current?.update_time,
      userId:      meta?.id || meta?.user_id,
      company:     meta?.company_id,
      changes:     Object.keys(current).filter(k => previous[k] !== undefined && previous[k] !== current[k]).map(k => ({ field: k, from: previous[k], to: current[k] })),
      raw:         current,
    };
  },
};
