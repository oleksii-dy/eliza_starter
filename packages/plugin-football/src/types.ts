export type MatchData = {
    league: string;
    matches: Array<{
        homeTeam: string;
        awayTeam: string;
        score: string;
        status: string;
        events: string[];
    }>;
};

export type StandingsData = {
    league: string;
    standings: Array<{
        position: number;
        team: string;
        points: number;
        goalDifference: number;
    }>;
};

export const isValidStandingsData = (data: any): data is StandingsData => {
    return (
        typeof data === "object" &&
        typeof data.league === "string" &&
        Array.isArray(data.standings) &&
        data.standings.every(
            (item: any) =>
                typeof item.position === "number" &&
                typeof item.team === "string" &&
                typeof item.points === "number" &&
                typeof item.goalDifference === "number"
        )
    );
};

export const isValidMatchData = (data: any): data is MatchData => {
    return (
        data &&
        Array.isArray(data.matches) &&
        data.matches.every(
            (match: any) =>
                match.homeTeam?.name &&
                match.awayTeam?.name &&
                typeof match.score?.fullTime?.homeTeam === "number" &&
                typeof match.score?.fullTime?.awayTeam === "number"
        )
    );
};
