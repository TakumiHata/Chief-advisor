"""Seed the ChromaDB knowledge base with CoC tactical knowledge.

Usage:
    docker compose exec image-analysis python -m scripts.seed_knowledge
    # or from host (if ChromaDB is on localhost:8100):
    PYTHONPATH=. python scripts/seed_knowledge.py
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services import knowledge_store

KNOWLEDGE_ENTRIES: list[dict] = [
    # ========== インフェルノタワー対策 ==========
    {
        "id": "defense_inferno_single",
        "text": "インフェルノタワー(単体モード)はDPSが時間経過で42→1800まで増加する。タンクやヒーローを数秒で溶かす最大の脅威。対策: フリーズを最優先で使用する。単体インフェルノに到達する前にフリーズを構えておく。ウォーデンアビリティと組み合わせるのも有効。",
        "metadata": {"category": "defense_counter", "defense": "インフェルノタワー", "tags": "インフェルノ,フリーズ,タンク"},
    },
    {
        "id": "defense_inferno_multi",
        "text": "インフェルノタワー(複数モード)は複数ユニットを同時に照射する。DPSは低めだが、ヒーラーの回復を無効化する。クイヒー(クイーンヒーラー)構成の天敵。対策: レイジでヒーラーの回復量を上げて押し切る、またはフリーズで止める。",
        "metadata": {"category": "defense_counter", "defense": "インフェルノタワー", "tags": "インフェルノ,複数,クイヒー,ヒーラー"},
    },
    {
        "id": "defense_multi_inferno",
        "text": "マルチインフェルノタワーはTH16で追加された防衛施設。複数ターゲットを同時に照射し、通常のインフェルノタワーと同様にヒーラーの回復を無効化する。対策: フリーズで止めるか、大量のユニットで押し切る。",
        "metadata": {"category": "defense_counter", "defense": "マルチインフェルノタワー", "tags": "マルチインフェルノ,フリーズ"},
    },
    # ========== イーグル砲対策 ==========
    {
        "id": "defense_eagle",
        "text": "イーグル砲はマップ全域に範囲ダメージ(DPS500)を与える。150ユニットスペース投入後に起動する。中盤以降のサポートユニット壊滅の主因。対策: ウォーデンアビリティをイーグル砲の集中砲火に合わせる。可能ならフリーズも重ねる。ロイヤルチャンピオンで早期破壊を狙うのも有効。",
        "metadata": {"category": "defense_counter", "defense": "イーグル砲", "tags": "イーグル,ウォーデン,範囲ダメージ"},
    },
    # ========== スキャッターショット対策 ==========
    {
        "id": "defense_scatter",
        "text": "スキャッターショットは着弾時に破片が散乱し、密集したユニットに大ダメージを与える。ボウラーやウィッチのスケルトンなど、密集しやすいユニットに特に有効。対策: ユニットを分散して投入する。レイジで素早く通過する。",
        "metadata": {"category": "defense_counter", "defense": "スキャッターショット", "tags": "スキャッター,密集,破片"},
    },
    # ========== モノリス対策 ==========
    {
        "id": "defense_monolith",
        "text": "モノリスはDPS350に加えてHP割合ダメージを与える。HPの高いユニット(ゴーレム、ラヴァハウンド等)ほど痛い。タンクキラー施設。対策: モノリスの射程内にタンクを長時間留めない。レイジで素早く通過するか、フリーズで止める。",
        "metadata": {"category": "defense_counter", "defense": "モノリス", "tags": "モノリス,HP割合,タンク"},
    },
    # ========== 巨大爆弾対策 ==========
    {
        "id": "trap_giant_bomb",
        "text": "巨大爆弾は範囲450ダメージの罠。2連巨爆はスーパーイエティを即死させうる。壁の間や防衛施設の隙間に配置されやすい。対策: ヒールを巨爆予想ゾーンに先置きする。ユニットの投入を少し分散させて一度に全滅しないようにする。",
        "metadata": {"category": "defense_counter", "defense": "巨大爆弾", "tags": "巨爆,イエティ,ヒール"},
    },
    # ========== トルネードトラップ対策 ==========
    {
        "id": "trap_tornado",
        "text": "トルネードトラップはユニットを吸い寄せて密集させる。スキャッターショットや巨爆と連携すると壊滅的。対策: トルネードの位置を予測して呪文のタイミングを調整する。密集した直後にヒールを置く。",
        "metadata": {"category": "defense_counter", "defense": "トルネードトラップ", "tags": "トルネード,密集,スキャッター"},
    },
    # ========== スーパーイエティ編成 ==========
    {
        "id": "comp_super_yeti_overview",
        "text": "スーパーイエティ編成はTH18の主力攻め編成の一つ。スーパーイエティ8〜10体をメインタンク兼火力とし、ヒーラー4〜5体でクイヒーを組む。呪文はレイジ2、フリーズ3〜4、ヒール1、ポイズン1が基本。攻城マシンはウォールバスターかログランチャー。",
        "metadata": {"category": "composition", "comp": "スーパーイエティ", "tags": "スーパーイエティ,編成,TH18"},
    },
    {
        "id": "comp_super_yeti_funneling",
        "text": "スーパーイエティ編成のファネリングは最重要工程。両サイドにウィザードやヒーローを出してサイドカットし、メインユニットが中央に向かうよう誘導する。ファネリング不足でイエティが外周を回ると全壊失敗の最大原因になる。15秒以内に完了させる。",
        "metadata": {"category": "tactic", "comp": "スーパーイエティ", "tags": "ファネリング,サイドカット,外周"},
    },
    {
        "id": "comp_super_yeti_deploy",
        "text": "スーパーイエティの投入は一列に並べて2〜3箇所に分散投入が理想。一箇所に固めると巨爆やスキャッターで一気に壊滅するリスクがある。ウォールブレイカーで壁を開けてから投入する。",
        "metadata": {"category": "tactic", "comp": "スーパーイエティ", "tags": "投入,分散,壁開け"},
    },
    {
        "id": "comp_super_yeti_spells",
        "text": "スーパーイエティ編成の呪文運用: レイジは防衛密集エリアで使用。フリーズはインフェルノタワー・イーグル砲・CC援軍に合わせる(最低1本は後半用に温存)。ヒールは巨爆ゾーン通過時。ウォーデンアビリティはイーグル砲の集中砲火やインフェルノのDPSピーク時に使用。",
        "metadata": {"category": "tactic", "comp": "スーパーイエティ", "tags": "呪文,レイジ,フリーズ,ヒール,ウォーデン"},
    },
    # ========== クイヒー (クイーンヒーラー) ==========
    {
        "id": "tactic_queen_healer",
        "text": "クイヒー(クイーンヒーラー/クイーンウォーク)はアーチャークイーン+ヒーラー4〜5体で片側の防衛を処理する戦術。エアスイーパーの向きに注意し、ヒーラーが飛ばされないルートを選ぶ。対空砲の射程にも注意。クイーンのアビリティはHP残り30%程度で使用。",
        "metadata": {"category": "tactic", "comp": "汎用", "tags": "クイヒー,クイーン,ヒーラー,エアスイーパー"},
    },
    # ========== CC処理 ==========
    {
        "id": "tactic_cc_handling",
        "text": "クランの城(CC)援軍の処理は攻撃成功の鍵。援軍を無視してメインユニットを出すと、援軍に釣られてバラける。対策: ポイズンをCC援軍に即投下。クイヒーで事前に処理するのが理想。援軍を釣り出してから処理する従来の方法も有効。",
        "metadata": {"category": "tactic", "comp": "汎用", "tags": "CC,援軍,ポイズン,クイヒー"},
    },
    # ========== ヒーロー運用 ==========
    {
        "id": "tactic_hero_usage",
        "text": "ヒーローの運用ミスは攻撃失敗の大きな原因。バーバリアンキングは壁役としてタンクの前に出さず、後方から投入。アーチャークイーンはクイヒーまたは後方支援。グランドウォーデンはメイン部隊と一緒に行動させ、アビリティのタイミングが最重要。ロイヤルチャンピオンは裏取り要員として残った区画に投入。",
        "metadata": {"category": "tactic", "comp": "汎用", "tags": "ヒーロー,BK,AQ,GW,RC"},
    },
    {
        "id": "tactic_warden_ability",
        "text": "グランドウォーデンのアビリティ(エターナルトーム)はチーム全体を無敵にする。使いどころ: イーグル砲の起動直後、インフェルノタワーのDPSがピークに達した時、巨爆ゾーン通過時。序盤に使ってしまうと後半で防衛が残った時に対処できなくなる。",
        "metadata": {"category": "tactic", "comp": "汎用", "tags": "ウォーデン,アビリティ,エターナルトーム,無敵"},
    },
    # ========== 失敗パターン ==========
    {
        "id": "failure_funneling",
        "text": "ファネリング失敗: イエティが外周を回り始め、中央の防衛が残る。原因はサイドカットが不十分。対策: ウィザードを追加する。ヒーローで片側を確実にカット。投入前に必ず外周の建物を2〜3個壊してからメインユニットを出す。",
        "metadata": {"category": "failure_pattern", "tags": "ファネリング,外周,サイドカット"},
    },
    {
        "id": "failure_time",
        "text": "タイムフェイル(時間切れ): 95〜99%で時間切れになる。原因はファネリングに時間をかけすぎ、残存施設が散在。対策: ファネリングは15秒以内に完了。ロイヤルチャンピオンを裏取りに使って残り施設を処理。攻城マシンの到達が遅い場合はログランチャーを検討。",
        "metadata": {"category": "failure_pattern", "tags": "タイムフェイル,時間切れ,裏取り"},
    },
    {
        "id": "failure_spell_waste",
        "text": "呪文の無駄遣い: 序盤で呪文を使い切って後半が裸になるパターン。フリーズは最低1本を後半用に温存。レイジは防衛密集地帯に合わせて使い、序盤のファネリングには使わない。ヒールは巨爆ゾーンに先置きが基本。",
        "metadata": {"category": "failure_pattern", "tags": "呪文,フリーズ,レイジ,温存"},
    },
    {
        "id": "failure_hero_death",
        "text": "ヒーローの無駄死に: ヒーローを先出しして集中砲火を受け、アビリティが無駄になる。対策: タンクの後ろからヒーローを出す。アビリティはHPが30%程度になってから使用。序盤にヒーローを単体で出さない(クイヒー構成を除く)。",
        "metadata": {"category": "failure_pattern", "tags": "ヒーロー,無駄死に,アビリティ"},
    },
    # ========== TH18配置の特徴 ==========
    {
        "id": "base_th18_features",
        "text": "TH18の配置には以下の特徴がある: マルチインフェルノタワーの追加により防衛力が大幅に強化。スペルタワーがレイジ/ポイズン/インビジブルを自動発動。モノリスのHP割合ダメージでタンク戦術が厳しい。攻略のポイントは複数のインフェルノ・マルチインフェルノへのフリーズ配分。",
        "metadata": {"category": "base_analysis", "tags": "TH18,配置,マルチインフェルノ,スペルタワー"},
    },
    {
        "id": "base_anti_3star",
        "text": "対全壊配置の特徴: タウンホールを中央に配置し、周囲にインフェルノタワーとイーグル砲を配置。巨爆を壁の間に仕込む。CC援軍を中央寄りに配置して早期に援軍が出るようにする。攻略法: まずCC援軍の位置を確認し、クイヒーで片側を崩してからメイン投入。",
        "metadata": {"category": "base_analysis", "tags": "配置,対全壊,中央TH"},
    },
]


def main():
    print("Seeding CoC knowledge base...")

    documents = [e["text"] for e in KNOWLEDGE_ENTRIES]
    metadatas = [e["metadata"] for e in KNOWLEDGE_ENTRIES]
    ids = [e["id"] for e in KNOWLEDGE_ENTRIES]

    added = knowledge_store.add_documents(
        documents=documents, metadatas=metadatas, ids=ids
    )
    print(f"Added {added} documents.")

    stats = knowledge_store.get_stats()
    print(f"Collection '{stats['collection']}' now has {stats['count']} documents.")


if __name__ == "__main__":
    main()
