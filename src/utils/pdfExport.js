import { jsPDF } from 'jspdf';

/**
 * Exports active captain sanctions to PDF
 * @param {Array} sanctions - Array of active sanctions
 * @param {number} currentRound - Current round number
 */
export const exportSanctionsToPDF = (sanctions, currentRound) => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('SANCIONES POR CAPITANÍA - RESUMEN', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Jornada Actual: ${currentRound}`, 105, 28, { align: 'center' });
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 105, 33, { align: 'center' });

    // Group sanctions by team
    const sanctionsByTeam = {};
    sanctions.forEach(s => {
        if (!sanctionsByTeam[s.teamName]) {
            sanctionsByTeam[s.teamName] = [];
        }
        sanctionsByTeam[s.teamName].push(s);
    });

    // Sort teams alphabetically
    const sortedTeams = Object.keys(sanctionsByTeam).sort();

    let yPosition = 45;
    const pageHeight = doc.internal.pageSize.height;
    const marginBottom = 20;

    sortedTeams.forEach((teamName, teamIndex) => {
        const teamSanctions = sanctionsByTeam[teamName];

        // Check if we need a new page
        if (yPosition > pageHeight - marginBottom - 40) {
            doc.addPage();
            yPosition = 20;
        }

        // Team header
        doc.setFillColor(59, 130, 246);
        doc.rect(15, yPosition - 5, 180, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(teamName, 20, yPosition, { baseline: 'top' });

        yPosition += 12;
        doc.setTextColor(0, 0, 0);

        // Sanctions for this team
        teamSanctions.forEach((sanction, idx) => {
            const startRound = sanction.outTeamUntil - 2;
            const referenceRound = Math.max(currentRound, startRound);
            const outTeamRoundsLeft = Math.max(0, sanction.outTeamUntil - referenceRound + 1);
            const noCaptRoundsLeft = Math.max(0, sanction.noCaptUntil - referenceRound + 1);

            // Calculate return rounds
            const returnToSquadRound = outTeamRoundsLeft > 0 ? referenceRound + outTeamRoundsLeft : 'Cumplido';
            const returnToCaptainRound = noCaptRoundsLeft > 0 ? referenceRound + noCaptRoundsLeft : 'Cumplido';

            // Check if we need a new page for this sanction
            if (yPosition > pageHeight - marginBottom - 35) {
                doc.addPage();
                yPosition = 20;
            }

            // Player name
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(`${idx + 1}. ${sanction.player}`, 20, yPosition);
            yPosition += 6;

            // Sanction details
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');

            // Out of team
            doc.setTextColor(220, 38, 38); // Red
            doc.text('• Fuera del equipo:', 25, yPosition);
            doc.setTextColor(0, 0, 0);
            if (outTeamRoundsLeft > 0) {
                doc.text(`${outTeamRoundsLeft} jornadas restantes (vuelve en J${returnToSquadRound})`, 70, yPosition);
            } else {
                doc.setTextColor(34, 197, 94); // Green
                doc.text('Cumplido', 70, yPosition);
                doc.setTextColor(0, 0, 0);
            }
            yPosition += 5;

            // No captain
            doc.setTextColor(245, 158, 11); // Orange
            doc.text('• Sin capitanía:', 25, yPosition);
            doc.setTextColor(0, 0, 0);
            if (noCaptRoundsLeft > 0) {
                doc.text(`${noCaptRoundsLeft} jornadas restantes (puede ser capitán en J${returnToCaptainRound})`, 70, yPosition);
            } else {
                doc.setTextColor(34, 197, 94); // Green
                doc.text('Cumplido', 70, yPosition);
                doc.setTextColor(0, 0, 0);
            }
            yPosition += 5;

            // Period
            doc.setTextColor(100, 100, 100);
            doc.setFontSize(8);
            doc.text(`Periodo de sanción: J${sanction.outTeamUntil - 2} — J${sanction.noCaptUntil}`, 25, yPosition);
            doc.setTextColor(0, 0, 0);
            yPosition += 8;

            // Separator line between players
            if (idx < teamSanctions.length - 1) {
                doc.setDrawColor(200, 200, 200);
                doc.line(20, yPosition, 195, yPosition);
                yPosition += 3;
            }
        });

        yPosition += 8; // Space between teams
    });

    // Footer on last page
    const totalPages = doc.internal.pages.length - 1; // -1 because pages array includes a null first element
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Página ${i} de ${totalPages}`, 105, pageHeight - 10, { align: 'center' });
        doc.text('Fuentmondo Manager - Liga Fuentmondo', 105, pageHeight - 5, { align: 'center' });
    }

    // Save the PDF
    const fileName = `Sanciones_Capitania_J${currentRound}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
};
