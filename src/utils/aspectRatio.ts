import { ProductionProject } from '../shared/types';

export const getProjectAspectRatioClass = (project: ProductionProject | null | undefined): string => {
  if (!project) return 'aspect-video';
  const ratio = (project.affiliateConfig as any)?.aspectRatio || 
                project.animationConfig?.aspectRatio || 
                project.educationalConfig?.aspectRatio || 
                '9:16';
  
  if (ratio === '9:16') return 'aspect-[9/16]';
  if (ratio === '1:1') return 'aspect-square';
  if (ratio === '16:9') return 'aspect-video';
  return 'aspect-[9/16]'; // default to vertical 9:16 as it's common for tiktok/shorts
}
