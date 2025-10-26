import { useState, useEffect } from "react";
import { Star } from "lucide-react";

// Import generated profile images
import africanBusinesswoman from "@assets/generated_images/African_businesswoman_headshot_portrait_90ce710b.png";
import africanBusinessman from "@assets/generated_images/African_businessman_headshot_portrait_2035126f.png";
import traditionalWoman from "@assets/generated_images/African_woman_traditional_dress_portrait_4fc73e8f.png";
import youngMan from "@assets/generated_images/Young_African_man_casual_portrait_c6fb7df7.png";
import ghanaianWoman from "@assets/generated_images/Ghanaian_businesswoman_portrait_1a36fafe.png";

interface Testimonial {
  id: number;
  name: string;
  city: string;
  country: string;
  message: string;
  photo: string;
  rating: number;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: "Aminata Diallo",
    city: "Dakar",
    country: "Sénégal",
    message: "Grâce à SIKA TEXTE, j'ai pu payer mon abonnement internet en seulement deux jours de travail.",
    photo: africanBusinesswoman,
    rating: 5
  },
  {
    id: 2,
    name: "Koffi Mensah",
    city: "Abidjan", 
    country: "Côte d'Ivoire",
    message: "Corriger des phrases, c'est simple, et en plus je suis payé chaque jour.",
    photo: africanBusinessman,
    rating: 5
  },
  {
    id: 3,
    name: "Fatou Traoré",
    city: "Cotonou",
    country: "Bénin",
    message: "Je fais mes corrections le matin et je retire le soir, c'est super pratique.",
    photo: traditionalWoman,
    rating: 5
  },
  {
    id: 4,
    name: "Ibrahim Ouédraogo",
    city: "Ouagadougou",
    country: "Burkina Faso",
    message: "Avant je cherchais des petits jobs, maintenant SIKA TEXTE me donne mes 7 800 FCFA quotidiens.",
    photo: youngMan,
    rating: 5
  },
  {
    id: 5,
    name: "Akosua Asante",
    city: "Lomé",
    country: "Togo",
    message: "J'ai testé avec seulement 3 phrases = 1 950 FCFA, et le retrait a marché directement.",
    photo: ghanaianWoman,
    rating: 5
  },
  {
    id: 6,
    name: "Moussa Cissé",
    city: "Porto-Novo",
    country: "Bénin",
    message: "Ce qui me plaît, c'est que je n'ai pas besoin de parrainer pour gagner.",
    photo: africanBusinessman,
    rating: 5
  },
  {
    id: 7,
    name: "Aïcha Balde",
    city: "Ziguinchor",
    country: "Sénégal",
    message: "En 10 jours, j'ai déjà retiré plus de 78 000 FCFA sans aucun problème.",
    photo: africanBusinesswoman,
    rating: 5
  },
  {
    id: 8,
    name: "Kwame Adjei",
    city: "Kara",
    country: "Togo",
    message: "Simple, rapide et rentable. Je recommande à tous mes amis.",
    photo: youngMan,
    rating: 5
  },
  {
    id: 9,
    name: "Mariam Diabaté",
    city: "Bouaké",
    country: "Côte d'Ivoire",
    message: "Même en corrigeant 8 phrases, je gagne déjà 5 200 FCFA par jour.",
    photo: traditionalWoman,
    rating: 5
  },
  {
    id: 10,
    name: "Seydou Keita",
    city: "Parakou",
    country: "Bénin",
    message: "C'est incroyable de voir qu'une simple correction me paie en euros.",
    photo: africanBusinessman,
    rating: 5
  },
  {
    id: 11,
    name: "Fatoumata Sow",
    city: "Saint-Louis",
    country: "Sénégal",
    message: "Chaque soir, je sais que j'aurai mon argent. Ça donne confiance.",
    photo: ghanaianWoman,
    rating: 5
  },
  {
    id: 12,
    name: "Yaw Boateng",
    city: "Sokodé",
    country: "Togo",
    message: "J'adore la régularité des gains, c'est tous les jours pareil.",
    photo: youngMan,
    rating: 5
  },
  {
    id: 13,
    name: "Adama Koné",
    city: "Korhogo",
    country: "Côte d'Ivoire",
    message: "Avec 7 800 FCFA/jour, j'arrive facilement à plus de 200 000 FCFA par mois.",
    photo: africanBusinesswoman,
    rating: 5
  },
  {
    id: 14,
    name: "Ramatou Sangaré",
    city: "Bobo-Dioulasso",
    country: "Burkina Faso",
    message: "Je pensais que c'était compliqué, mais en 5 minutes je corrige mes phrases.",
    photo: traditionalWoman,
    rating: 5
  },
  {
    id: 15,
    name: "Emmanuel Asante",
    city: "Kpalimé",
    country: "Togo",
    message: "Même avec un emploi du temps chargé, je trouve le temps pour corriger et encaisser.",
    photo: africanBusinessman,
    rating: 5
  },
  {
    id: 16,
    name: "Binta Camara",
    city: "Tambacounda",
    country: "Sénégal",
    message: "Ce site est devenu ma source principale de revenu.",
    photo: ghanaianWoman,
    rating: 5
  },
  {
    id: 17,
    name: "Joseph Tetteh",
    city: "Abomey-Calavi",
    country: "Bénin",
    message: "C'est plus rentable que beaucoup de petits boulots physiques.",
    photo: youngMan,
    rating: 5
  },
  {
    id: 18,
    name: "Salimata Touré",
    city: "Atakpamé",
    country: "Togo",
    message: "Les retraits sont directs, pas besoin d'attendre plusieurs jours.",
    photo: africanBusinesswoman,
    rating: 5
  },
  {
    id: 19,
    name: "Kofi Ampong",
    city: "Djougou",
    country: "Bénin",
    message: "J'aime la simplicité de la plateforme, tout est clair.",
    photo: africanBusinessman,
    rating: 5
  },
  {
    id: 20,
    name: "Hawa Diakité",
    city: "Bassar",
    country: "Togo",
    message: "J'ai déjà retiré plusieurs fois via Mobile Money, ça marche parfaitement.",
    photo: traditionalWoman,
    rating: 5
  },
  {
    id: 21,
    name: "Francis Mensah",
    city: "Bohicon",
    country: "Bénin",
    message: "1 € par phrase, ça peut sembler petit, mais au final ça rapporte gros.",
    photo: youngMan,
    rating: 5
  },
  {
    id: 22,
    name: "Rokia Cissoko",
    city: "Tsevie",
    country: "Togo",
    message: "Avec SIKA TEXTE, je gagne même plus que mon salaire habituel.",
    photo: ghanaianWoman,
    rating: 5
  },
  {
    id: 23,
    name: "Abdul Rahman",
    city: "Natitingou",
    country: "Bénin",
    message: "Je peux travailler depuis mon téléphone, où que je sois.",
    photo: africanBusinessman,
    rating: 5
  },
  {
    id: 24,
    name: "Maimouna Ba",
    city: "Kolda",
    country: "Sénégal",
    message: "En une semaine, j'ai gagné de quoi payer mon loyer.",
    photo: africanBusinesswoman,
    rating: 5
  },
  {
    id: 25,
    name: "Samuel Osei",
    city: "Aneho",
    country: "Togo",
    message: "Le fait qu'il n'y ait pas de parrainage obligatoire, c'est ce qui m'a attiré.",
    photo: youngMan,
    rating: 5
  },
  {
    id: 26,
    name: "Assata Kaba",
    city: "Kandi",
    country: "Bénin",
    message: "Corriger des phrases européennes est simple et amusant.",
    photo: traditionalWoman,
    rating: 5
  },
  {
    id: 27,
    name: "Richmond Asiedu",
    city: "Mango",
    country: "Togo",
    message: "Mes premiers retraits ont été très rapides. Je suis satisfait.",
    photo: africanBusinessman,
    rating: 5
  },
  {
    id: 28,
    name: "Ndeye Fatou",
    city: "Kaolack",
    country: "Sénégal",
    message: "Ce qui est bien, c'est que les gains sont garantis chaque jour.",
    photo: ghanaianWoman,
    rating: 5
  },
  {
    id: 29,
    name: "Prince Owusu",
    city: "Savalou",
    country: "Bénin",
    message: "J'utilise SIKA TEXTE comme un complément de revenu.",
    photo: youngMan,
    rating: 5
  },
  {
    id: 30,
    name: "Awa Diop",
    city: "Thiès",
    country: "Sénégal",
    message: "Avec 12 phrases par jour, je me sens financièrement plus libre.",
    photo: africanBusinesswoman,
    rating: 5
  },
  {
    id: 31,
    name: "Eric Adjabeng",
    city: "Dassa-Zoumé",
    country: "Bénin",
    message: "J'ai testé, et aujourd'hui je ne peux plus m'en passer.",
    photo: africanBusinessman,
    rating: 5
  },
  {
    id: 32,
    name: "Penda Ndiaye",
    city: "Louga",
    country: "Sénégal",
    message: "Même en corrigeant seulement 4 phrases, j'ai reçu mes 2 600 FCFA sans problème.",
    photo: traditionalWoman,
    rating: 5
  },
  {
    id: 33,
    name: "Daniel Appiah",
    city: "Dapaong",
    country: "Togo",
    message: "La régularité des paiements me rassure.",
    photo: youngMan,
    rating: 5
  },
  {
    id: 34,
    name: "Adja Mballo",
    city: "Matam",
    country: "Sénégal",
    message: "Pas de publicité, pas de piège. Juste corriger et encaisser.",
    photo: ghanaianWoman,
    rating: 5
  },
  {
    id: 35,
    name: "Isaac Agyeman",
    city: "Ouidah",
    country: "Bénin",
    message: "Je gagne plus en une journée ici qu'en une semaine ailleurs.",
    photo: africanBusinessman,
    rating: 5
  },
  {
    id: 36,
    name: "Daba Kouyaté",
    city: "Nikki",
    country: "Bénin",
    message: "La conversion euro → FCFA est vraiment intéressante.",
    photo: africanBusinesswoman,
    rating: 5
  },
  {
    id: 37,
    name: "Benjamin Danso",
    city: "Vogan",
    country: "Togo",
    message: "Je ne pensais pas que ce serait aussi simple de générer un revenu en ligne.",
    photo: youngMan,
    rating: 5
  },
  {
    id: 38,
    name: "Khady Faye",
    city: "Fatick",
    country: "Sénégal",
    message: "Je recommande cette plateforme à ceux qui veulent des gains rapides.",
    photo: traditionalWoman,
    rating: 5
  },
  {
    id: 39,
    name: "George Acheampong",
    city: "Agué",
    country: "Bénin",
    message: "En corrigeant 12 phrases, je peux couvrir mes petites dépenses quotidiennes.",
    photo: africanBusinessman,
    rating: 5
  },
  {
    id: 40,
    name: "Mame Diarra",
    city: "Diourbel",
    country: "Sénégal",
    message: "J'ai enfin trouvé un site sérieux qui paie réellement.",
    photo: ghanaianWoman,
    rating: 5
  },
  {
    id: 41,
    name: "Patrick Okyere",
    city: "Tchaoudjo",
    country: "Togo",
    message: "7 800 FCFA par jour, ça paraît peu, mais accumulé c'est énorme.",
    photo: youngMan,
    rating: 5
  },
  {
    id: 42,
    name: "Coumba Diouf",
    city: "Mbour",
    country: "Sénégal",
    message: "Je gagne tous les jours sans devoir inviter qui que ce soit.",
    photo: africanBusinesswoman,
    rating: 5
  },
  {
    id: 43,
    name: "Michael Asante",
    city: "Lokossa",
    country: "Bénin",
    message: "Même ma mère a commencé à corriger des phrases et elle adore.",
    photo: africanBusinessman,
    rating: 5
  },
  {
    id: 44,
    name: "Arame Fall",
    city: "Rufisque",
    country: "Sénégal",
    message: "Avec les retraits par Mobile Money, je reçois mon argent immédiatement.",
    photo: traditionalWoman,
    rating: 5
  },
  {
    id: 45,
    name: "Stephen Boateng",
    city: "Blitta",
    country: "Togo",
    message: "Je suis content de voir que mes efforts sont directement récompensés.",
    photo: youngMan,
    rating: 5
  },
  {
    id: 46,
    name: "Yacine Sall",
    city: "Kédougou",
    country: "Sénégal",
    message: "Corriger des phrases me prend à peine un quart d'heure.",
    photo: ghanaianWoman,
    rating: 5
  },
  {
    id: 47,
    name: "Robert Amponsah",
    city: "Come",
    country: "Bénin",
    message: "J'ai déjà gagné plus de 100 000 FCFA en moins de deux semaines.",
    photo: africanBusinessman,
    rating: 5
  },
  {
    id: 48,
    name: "Bineta Sarr",
    city: "Podor",
    country: "Sénégal",
    message: "C'est simple : corriger → gagner → retirer. Pas besoin de plus.",
    photo: africanBusinesswoman,
    rating: 5
  },
  {
    id: 49,
    name: "Emmanuel Mensah",
    city: "Notse",
    country: "Togo",
    message: "Le fait d'être payé en euros est un gros avantage.",
    photo: youngMan,
    rating: 5
  },
  {
    id: 50,
    name: "Astou Gueye",
    city: "Linguère",
    country: "Sénégal",
    message: "Merci SIKA TEXTE, vous avez changé ma manière de travailler en ligne.",
    photo: traditionalWoman,
    rating: 5
  }
];

export default function TestimonialsSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 4) % testimonials.length);
        setIsVisible(true);
      }, 300);
    }, 4000); // Change every 4 seconds

    return () => clearInterval(interval);
  }, []);

  const getVisibleTestimonials = () => {
    const visible = [];
    for (let i = 0; i < 4; i++) {
      const index = (currentIndex + i) % testimonials.length;
      visible.push(testimonials[index]);
    }
    return visible;
  };

  const visibleTestimonials = getVisibleTestimonials();

  return (
    <div className="mt-8">
      <h3 className="font-semibold mb-4 text-center" data-testid="text-testimonials-title">
        Ce que disent nos utilisateurs
      </h3>
      
      <div className="relative overflow-hidden">
        <div 
          className={`transition-all duration-300 space-y-3 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
          }`}
        >
          {visibleTestimonials.map((testimonial, index) => (
            <div
              key={`${testimonial.id}-${currentIndex}`}
              className="bg-card dark:bg-card rounded-xl p-4 shadow-sm border border-border"
              data-testid={`testimonial-${testimonial.id}`}
            >
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                  <img 
                    src={testimonial.photo} 
                    alt={testimonial.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-foreground truncate">
                    {testimonial.name}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {testimonial.city}, {testimonial.country}
                  </div>
                </div>
                <div className="flex text-yellow-400 text-xs">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-current" />
                  ))}
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                "{testimonial.message}"
              </p>
            </div>
          ))}
        </div>
        
        {/* Progress indicator */}
        <div className="flex justify-center mt-4 space-x-1">
          {Array.from({ length: Math.ceil(testimonials.length / 4) }).map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                Math.floor(currentIndex / 4) === index
                  ? 'bg-primary'
                  : 'bg-muted'
              }`}
            />
          ))}
        </div>
        
        {/* Logout Button */}
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              fetch("/api/auth/logout", {
                method: "POST",
                credentials: "include",
              }).then(() => {
                window.location.href = "/";
              }).catch(() => {
                window.location.href = "/";
              });
            }}
            className="inline-flex items-center space-x-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
            data-testid="button-logout-bottom"
          >
            <i className="fas fa-sign-out-alt text-lg"></i>
            <span>Se déconnecter</span>
          </button>
        </div>
      </div>
    </div>
  );
}