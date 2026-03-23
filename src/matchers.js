import path from 'node:path';

export function findExactActionMatch(actionName, candidates) {
  return candidates.find((candidate) => candidate.label === actionName) ?? null;
}

export function buildDownloadPlan(actionName, videoUrls) {
  return videoUrls.map((videoUrl, index) => {
    const extension = path.extname(new URL(videoUrl).pathname) || '.mp4';

    return {
      actionName,
      videoUrl,
      fileName: `${actionName}_${index + 1}${extension}`,
      index: index + 1,
    };
  });
}
