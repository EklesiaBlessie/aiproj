class PrioritizationService:

    def prioritize(self, framework, features):

        framework = str(framework).strip().upper()

        aliases = {
            "RICE": "RICE",
            "ICE": "ICE",
            "MOSCOW": "MOSCOW",
            "MO SCOW": "MOSCOW",
            "MOSCOW MODEL": "MOSCOW",
        }

        framework = aliases.get(framework, framework)

        if framework not in ["RICE", "ICE", "MOSCOW"]:
            raise ValueError(
                "Framework must be RICE, ICE, or MOSCOW"
            )

        scored = []

        for feature in features:

            if framework == "RICE":

                if (
                    feature.reach is None
                    or feature.impact is None
                    or feature.confidence is None
                    or feature.effort is None
                ):
                    raise ValueError(
                        f"RICE requires reach, impact, confidence "
                        f"and effort for '{feature.name}'"
                    )

                if feature.effort <= 0:
                    raise ValueError(
                        f"Effort must be greater than 0 "
                        f"for '{feature.name}'"
                    )

                score = (
                    feature.reach
                    * feature.impact
                    * feature.confidence
                ) / feature.effort

            elif framework == "ICE":

                if (
                    feature.impact is None
                    or feature.confidence is None
                    or feature.ease is None
                ):
                    raise ValueError(
                        f"ICE requires impact, confidence and ease "
                        f"for '{feature.name}'"
                    )

                score = (
                    feature.impact
                    * feature.confidence
                    * feature.ease
                )

            else:

                if not feature.mos_cow:
                    raise ValueError(
                        f"MoSCoW category required "
                        f"for '{feature.name}'"
                    )

                weights = {
                    "MUST": 4,
                    "SHOULD": 3,
                    "COULD": 2,
                    "WONT": 1,
                    "WON'T": 1,
                }

                category = str(
                    feature.mos_cow
                ).strip().upper()

                if category not in weights:
                    raise ValueError(
                        "MoSCoW must be Must, Should, "
                        "Could, or Won't"
                    )

                score = weights[category]

            scored.append(
                {
                    "name": feature.name,
                    "score": round(float(score), 2),
                }
            )

        scored.sort(
            key=lambda x: x["score"],
            reverse=True
        )

        ranked_features = []

        for index, feature in enumerate(
            scored,
            start=1
        ):
            ranked_features.append(
                {
                    "name": feature["name"],
                    "score": feature["score"],
                    "rank": index,
                    "framework": framework,
                }
            )

        return {
            "framework": framework,
            "ranked_features": ranked_features,
        }