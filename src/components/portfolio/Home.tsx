import GameMenu, { type Navigate } from "./GameMenu";

type Props = {
	onNavigate: Navigate;
};

export default function Home({ onNavigate }: Props) {
	return <GameMenu onNavigate={onNavigate} active titleId />;
}
