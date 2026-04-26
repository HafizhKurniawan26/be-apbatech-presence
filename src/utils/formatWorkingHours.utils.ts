export class FormatWorkingHours {
  public static formatWorkingHours(hours: number): string {
    const totalMinutes = Math.floor(hours * 60);
    const jam = Math.floor(totalMinutes / 60);
    const menit = totalMinutes % 60;
    return `${jam} jam ${menit} menit`;
  }
}
