/**
 * Sends a WhatsApp report via the local bridge server.
 * @param {Array} sanctions - List of active sanctions.
 * @param {number} roundNumber - Current round number.
 * @param {string} groupName - Exact name of the WhatsApp group.
 */
export const sendWhatsAppReport = async (sanctions, roundNumber, groupName) => {
    if (!sanctions || sanctions.length === 0) return { error: 'No sanctions to report' };

    // 1. Group by team (Filtering out expired sanctions)
    const activeSanctions = sanctions.filter(s => s.noCaptUntil >= roundNumber);

    if (activeSanctions.length === 0) return { error: 'No active sanctions to report' };

    const grouped = activeSanctions.reduce((acc, s) => {
        if (!acc[s.teamName]) acc[s.teamName] = [];
        acc[s.teamName].push(s);
        return acc;
    }, {});

    // 2. Format text for WhatsApp (with bold/italics)
    let text = `📢 *INFORME DE SANCIONES - JORNADA ${roundNumber}*\n\n`;

    Object.entries(grouped).forEach(([team, players]) => {
        text += `🟢 *EQUIPO: ${team.toUpperCase()}*\n`;
        players.forEach(p => {
            text += `  • _${p.player}_: Fuera hasta J${p.outTeamUntil} (Vuelve J${p.outTeamUntil + 1}) | Sin Cpt hasta J${p.noCaptUntil} (Vuelve J${p.noCaptUntil + 1})\n`;
        });
        text += '\n';
    });

    text += `_Notificación automática generada por Fuentmondo Manager_`;

    // 3. Call the local bridge
    try {
        const response = await fetch('http://localhost:3001/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, groupName })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Failed to send message');
        }

        return await response.json();
    } catch (err) {
        console.warn('WhatsApp bridge is not running at localhost:3001');
        return { error: 'Bridge offline', details: err.message };
    }
};
