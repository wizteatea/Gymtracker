export const MUSCLE_GROUPS = [
  { id: 'poitrine', label: 'Poitrine', emoji: '🫁' },
  { id: 'dos', label: 'Dos', emoji: '🔙' },
  { id: 'epaules', label: 'Épaules', emoji: '💪' },
  { id: 'biceps', label: 'Biceps', emoji: '💪' },
  { id: 'triceps', label: 'Triceps', emoji: '💪' },
  { id: 'jambes', label: 'Jambes', emoji: '🦵' },
  { id: 'abdominaux', label: 'Abdominaux', emoji: '🎯' },
  { id: 'cardio', label: 'Cardio', emoji: '❤️' },
]

export const DEFAULT_EXERCISES = [
  // Poitrine
  { id: 'ex_1', name: 'Développé couché', muscle: 'poitrine', type: 'musculation', description: 'Exercice de base pour la poitrine avec barre' },
  { id: 'ex_2', name: 'Développé incliné', muscle: 'poitrine', type: 'musculation', description: 'Cible la partie haute de la poitrine' },
  { id: 'ex_3', name: 'Développé décliné', muscle: 'poitrine', type: 'musculation', description: 'Cible la partie basse de la poitrine' },
  { id: 'ex_4', name: 'Écarté couché haltères', muscle: 'poitrine', type: 'musculation', description: 'Isolation de la poitrine' },
  { id: 'ex_5', name: 'Pompes', muscle: 'poitrine', type: 'musculation', description: 'Exercice au poids du corps' },
  { id: 'ex_6', name: 'Pec deck (butterfly)', muscle: 'poitrine', type: 'musculation', description: 'Machine d\'isolation pour la poitrine' },
  { id: 'ex_7', name: 'Poulie vis-à-vis', muscle: 'poitrine', type: 'musculation', description: 'Croisement de câbles pour la poitrine' },
  { id: 'ex_8', name: 'Dips (poitrine)', muscle: 'poitrine', type: 'musculation', description: 'Penché en avant pour cibler la poitrine' },

  // Dos
  { id: 'ex_10', name: 'Tractions', muscle: 'dos', type: 'musculation', description: 'Exercice roi pour le dos' },
  { id: 'ex_11', name: 'Rowing barre', muscle: 'dos', type: 'musculation', description: 'Tire la barre vers le nombril' },
  { id: 'ex_12', name: 'Rowing haltère', muscle: 'dos', type: 'musculation', description: 'Un bras à la fois, sur un banc' },
  { id: 'ex_13', name: 'Tirage vertical', muscle: 'dos', type: 'musculation', description: 'Machine reproduisant les tractions' },
  { id: 'ex_14', name: 'Tirage horizontal', muscle: 'dos', type: 'musculation', description: 'Poulie basse, prise serrée ou large' },
  { id: 'ex_15', name: 'Soulevé de terre', muscle: 'dos', type: 'musculation', description: 'Exercice compound pour le dos et jambes' },
  { id: 'ex_16', name: 'Pullover', muscle: 'dos', type: 'musculation', description: 'Haltère derrière la tête sur un banc' },
  { id: 'ex_17', name: 'Shrugs', muscle: 'dos', type: 'musculation', description: 'Élévation des épaules pour les trapèzes' },
  { id: 'ex_18', name: 'Rowing T-bar', muscle: 'dos', type: 'musculation', description: 'Rowing avec barre en T' },

  // Épaules
  { id: 'ex_20', name: 'Développé militaire', muscle: 'epaules', type: 'musculation', description: 'Presse au-dessus de la tête avec barre' },
  { id: 'ex_21', name: 'Développé haltères', muscle: 'epaules', type: 'musculation', description: 'Presse au-dessus de la tête avec haltères' },
  { id: 'ex_22', name: 'Élévations latérales', muscle: 'epaules', type: 'musculation', description: 'Isolation du deltoïde latéral' },
  { id: 'ex_23', name: 'Élévations frontales', muscle: 'epaules', type: 'musculation', description: 'Isolation du deltoïde antérieur' },
  { id: 'ex_24', name: 'Oiseau (rear delt)', muscle: 'epaules', type: 'musculation', description: 'Isolation du deltoïde postérieur' },
  { id: 'ex_25', name: 'Face pull', muscle: 'epaules', type: 'musculation', description: 'Tirage corde vers le visage' },
  { id: 'ex_26', name: 'Arnold press', muscle: 'epaules', type: 'musculation', description: 'Rotation pendant le développé' },

  // Biceps
  { id: 'ex_30', name: 'Curl barre', muscle: 'biceps', type: 'musculation', description: 'Flexion classique avec barre' },
  { id: 'ex_31', name: 'Curl haltères', muscle: 'biceps', type: 'musculation', description: 'Flexion alternée ou simultanée' },
  { id: 'ex_32', name: 'Curl marteau', muscle: 'biceps', type: 'musculation', description: 'Prise neutre pour brachial' },
  { id: 'ex_33', name: 'Curl incliné', muscle: 'biceps', type: 'musculation', description: 'Sur banc incliné pour étirement max' },
  { id: 'ex_34', name: 'Curl pupitre', muscle: 'biceps', type: 'musculation', description: 'Isolation stricte sur pupitre' },
  { id: 'ex_35', name: 'Curl poulie basse', muscle: 'biceps', type: 'musculation', description: 'Tension constante avec câble' },
  { id: 'ex_36', name: 'Curl concentré', muscle: 'biceps', type: 'musculation', description: 'Isolation maximale du biceps' },

  // Triceps
  { id: 'ex_40', name: 'Dips (triceps)', muscle: 'triceps', type: 'musculation', description: 'Corps droit pour cibler les triceps' },
  { id: 'ex_41', name: 'Extension poulie haute', muscle: 'triceps', type: 'musculation', description: 'Pushdown avec corde ou barre' },
  { id: 'ex_42', name: 'Barre au front', muscle: 'triceps', type: 'musculation', description: 'Skull crushers avec barre EZ' },
  { id: 'ex_43', name: 'Extension haltère au-dessus', muscle: 'triceps', type: 'musculation', description: 'Un ou deux bras au-dessus de la tête' },
  { id: 'ex_44', name: 'Kickback', muscle: 'triceps', type: 'musculation', description: 'Extension arrière avec haltère' },
  { id: 'ex_45', name: 'Développé couché prise serrée', muscle: 'triceps', type: 'musculation', description: 'Prise étroite pour cibler les triceps' },

  // Jambes
  { id: 'ex_50', name: 'Squat barre', muscle: 'jambes', type: 'musculation', description: 'Exercice fondamental pour les jambes' },
  { id: 'ex_51', name: 'Presse à cuisses', muscle: 'jambes', type: 'musculation', description: 'Machine pour quadriceps et fessiers' },
  { id: 'ex_52', name: 'Fentes', muscle: 'jambes', type: 'musculation', description: 'Avec haltères ou barre' },
  { id: 'ex_53', name: 'Leg extension', muscle: 'jambes', type: 'musculation', description: 'Isolation des quadriceps' },
  { id: 'ex_54', name: 'Leg curl', muscle: 'jambes', type: 'musculation', description: 'Isolation des ischio-jambiers' },
  { id: 'ex_55', name: 'Mollets debout', muscle: 'jambes', type: 'musculation', description: 'Élévation des mollets debout' },
  { id: 'ex_56', name: 'Mollets assis', muscle: 'jambes', type: 'musculation', description: 'Élévation des mollets assis' },
  { id: 'ex_57', name: 'Hip thrust', muscle: 'jambes', type: 'musculation', description: 'Extension de hanche pour les fessiers' },
  { id: 'ex_58', name: 'Squat bulgare', muscle: 'jambes', type: 'musculation', description: 'Fente pied arrière surélevé' },
  { id: 'ex_59', name: 'Hack squat', muscle: 'jambes', type: 'musculation', description: 'Machine squat guidé' },
  { id: 'ex_60', name: 'Adducteurs', muscle: 'jambes', type: 'musculation', description: 'Machine pour l\'intérieur des cuisses' },
  { id: 'ex_61', name: 'Abducteurs', muscle: 'jambes', type: 'musculation', description: 'Machine pour l\'extérieur des cuisses' },

  // Abdominaux
  { id: 'ex_70', name: 'Crunch', muscle: 'abdominaux', type: 'musculation', description: 'Exercice classique pour les abdos' },
  { id: 'ex_71', name: 'Crunch inversé', muscle: 'abdominaux', type: 'musculation', description: 'Ramener les genoux vers la poitrine' },
  { id: 'ex_72', name: 'Planche', muscle: 'abdominaux', type: 'musculation', description: 'Gainage statique' },
  { id: 'ex_73', name: 'Relevé de jambes', muscle: 'abdominaux', type: 'musculation', description: 'Suspendu à la barre' },
  { id: 'ex_74', name: 'Russian twist', muscle: 'abdominaux', type: 'musculation', description: 'Rotation du tronc avec poids' },
  { id: 'ex_75', name: 'Ab wheel', muscle: 'abdominaux', type: 'musculation', description: 'Roulette abdominale' },
  { id: 'ex_76', name: 'Crunch poulie', muscle: 'abdominaux', type: 'musculation', description: 'Crunch à la poulie haute' },
  { id: 'ex_77', name: 'Gainage latéral', muscle: 'abdominaux', type: 'musculation', description: 'Planche sur le côté' },

  // Cardio
  { id: 'ex_80', name: 'Course à pied', muscle: 'cardio', type: 'cardio', description: 'Tapis ou extérieur' },
  { id: 'ex_81', name: 'Vélo', muscle: 'cardio', type: 'cardio', description: 'Vélo stationnaire ou elliptique' },
  { id: 'ex_82', name: 'Rameur', muscle: 'cardio', type: 'cardio', description: 'Cardio complet du corps' },
  { id: 'ex_83', name: 'Marche inclinée', muscle: 'cardio', type: 'cardio', description: 'Tapis incliné, marche rapide' },
  { id: 'ex_84', name: 'Corde à sauter', muscle: 'cardio', type: 'cardio', description: 'Cardio haute intensité' },
  { id: 'ex_85', name: 'Vélo elliptique', muscle: 'cardio', type: 'cardio', description: 'Faible impact, cardio complet' },
  { id: 'ex_86', name: 'Escalier (stairmaster)', muscle: 'cardio', type: 'cardio', description: 'Simulation montée d\'escaliers' },
  { id: 'ex_87', name: 'HIIT', muscle: 'cardio', type: 'cardio', description: 'Intervalles haute intensité' },
]
