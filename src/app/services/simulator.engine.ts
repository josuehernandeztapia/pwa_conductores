import { SimulationInput, SimulationResult, MonthState, Award, Group, SimulationEvent, Member } from './simulation.models';

function calculateAnnuity(principal: number, annualRate: number, term: number): number {
    const monthlyRate = annualRate / 12;
    if (monthlyRate === 0) return principal / term;
    const factor = Math.pow(1 + monthlyRate, term);
    return principal * (monthlyRate * factor) / (factor - 1);
}

export function runSimulation(input: SimulationInput): SimulationResult {
    const { group, horizonMonths, events = [] } = input;
    const { productPackage } = group;

    let activeMembers: Member[] = JSON.parse(JSON.stringify(group.members));
    let queue = activeMembers.sort((a, b) => a.prio - b.prio).map(m => m.id);
    
    let savings = 0;
    const activeAwards: Award[] = [];
    const simulationMonths: MonthState[] = [];
    const finalAwards: Record<string, Award> = {};

    for (let t = 1; t <= horizonMonths; t++) {
        // --- Procesamiento de Eventos que alteran la estructura del grupo ---
        const structuralEvents = events.filter(e => e.month === t && (e.type === 'MEMBER_LEAVES' || e.type === 'MEMBER_JOINS'));
        for (const event of structuralEvents) {
            if (event.type === 'MEMBER_LEAVES') {
                activeMembers = activeMembers.filter(m => m.id !== event.memberId);
                queue = queue.filter(id => id !== event.memberId);
            } else if (event.type === 'MEMBER_JOINS') {
                const joinEvent = event as any; // Type assertion for now
                activeMembers.push(joinEvent.newMember);
                queue.push(joinEvent.newMember.id); // Se añade al final de la cola
            }
        }

        // --- Procesamiento de Eventos monetarios ---
        let eventBasedAdjustments = 0;
        const monetaryEvents = events.filter(e => e.month === t && (e.type === 'EXTRA_CONTRIBUTION' || e.type === 'MISSED_PAYMENT'));
        for (const event of monetaryEvents) {
            if (event.type === 'EXTRA_CONTRIBUTION') eventBasedAdjustments += event.amount;
            if (event.type === 'MISSED_PAYMENT') eventBasedAdjustments -= event.amount;
        }

        const baseInflow = activeMembers.reduce((sum, member) => sum + member.baseContribution, 0);
        const inflow = baseInflow + eventBasedAdjustments;

        const debtDue = activeAwards.reduce((sum, award) => sum + award.mds, 0);
        const surplus = inflow - debtDue;
        if (surplus >= 0) savings += surplus;

        const awardsInMonth: Award[] = [];
        const dpRequired = productPackage.price * productPackage.minDownPaymentPct;
        
        while (savings >= dpRequired && queue.length > 0) {
            const nextMemberId = queue.shift();
            if (!nextMemberId) break;
            savings -= dpRequired;
            const principal = productPackage.price - dpRequired;
            const mds = calculateAnnuity(principal, productPackage.rateAnnual, productPackage.term);
            const award: Award = { memberId: nextMemberId, month: t, unitPrice: productPackage.price, dpPaid: dpRequired, principal, mds };
            activeAwards.push(award);
            awardsInMonth.push(award);
            finalAwards[nextMemberId] = award;
        }
        
        simulationMonths.push({ t, inflow, debtDue, surplus, savings, awardsInMonth, riskBadge: surplus < 0 ? 'debtDeficit' : 'ok' });
        if (queue.length === 0 && activeMembers.length > 0) break; 
    }

    return { months: simulationMonths, finalAwards };
}