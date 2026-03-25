export class AssetStaging {
  public assetPath: string;
  public sourcePath: string;
  public relativeStagedPath: string;
  public stagedPath: string;
  public assetHash: string;
  public sourceHash: string;
  public packaging: string;
  public isArchive: boolean;

  constructor() {
    this.assetPath = 'mock-asset-path';
    this.sourcePath = 'mock-source-path';
    this.relativeStagedPath = 'mock-relative-staged-path';
    this.stagedPath = 'mock-staged-path';
    this.assetHash = 'mock-asset-hash';
    this.sourceHash = 'mock-source-hash';
    this.packaging = 'mock-packaging';
    this.isArchive = false;
  }
}
