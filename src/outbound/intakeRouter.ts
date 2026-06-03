import * as fs from 'fs';
import * as path from 'path';

export class IntakeRouter {
  private intakeDir: string;
  private archiveDir: string;

  constructor() {
    // Maps perfectly up to your project root folder
    this.intakeDir = path.join(__dirname, '../../intake');
    this.archiveDir = path.join(__dirname, '../../archive');
    this.ensureDirectoriesExist();
  }

  private ensureDirectoriesExist() {
    if (!fs.existsSync(this.intakeDir)) fs.mkdirSync(this.intakeDir, { recursive: true });
    if (!fs.existsSync(this.archiveDir)) fs.mkdirSync(this.archiveDir, { recursive: true });
  }

  public getPendingCSVFiles(): string[] {
    this.ensureDirectoriesExist();
    return fs.readdirSync(this.intakeDir)
      .filter(file => file.toLowerCase().endsWith('.csv'))
      .map(file => path.join(this.intakeDir, file));
  }

  public archiveProcessedFile(absoluteFilePath: string) {
    const filename = path.basename(absoluteFilePath);
    const ext = path.extname(filename);
    const base = path.basename(filename, ext);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archivedName = `${base}_processed_${timestamp}${ext}`;
    const destinationPath = path.join(this.archiveDir, archivedName);

    if (fs.existsSync(absoluteFilePath)) {
      fs.renameSync(absoluteFilePath, destinationPath);
      console.log(`📦 File Archived: Moved source to target directory -> archive/${archivedName}`);
    }
  }
}